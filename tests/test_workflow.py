import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from backend.store import Store, Problem, valid_fix
from backend.jobs import validate


class WorkflowTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(self.tmp.name + '/rooms.sqlite3')
        created = self.store.create('Engineer', 'traction')
        self.id, self.author = created['room'], created['token']
        self.reviewer = self.store.join(self.id, 'Reviewer')['token']

    def tearDown(self):
        self.store.db.close()
        self.tmp.cleanup()

    def room(self):
        return self.store.read(self.id, self.author)

    def propose(self):
        self.store.mutate(self.id, self.author, 'propose', {
            'fix': {'tunable': 'boot_traction_enabled', 'value': True},
            'reason': 'Negative ascent and disabled traction.'})
        return self.room()['proposal']['id']

    def approve(self, proposal):
        self.store.mutate(self.id, self.reviewer, 'approve', {'proposal_id': proposal})

    def test_room_access_requires_membership_not_just_room_url(self):
        with self.assertRaises(Problem) as context:
            self.store.read(self.id, 'untrusted')
        self.assertEqual(context.exception.status, 401)
        other = self.store.create('Other', 'assist')
        with self.assertRaises(Problem):
            self.store.read(self.id, other['token'])

    def test_shared_playhead_and_attributed_notes(self):
        self.store.mutate(self.id, self.author, 'cursor', {'step': 42})
        self.store.mutate(self.id, self.reviewer, 'annotate', {'text': 'No uphill progress', 'step': 42})
        room = self.room()
        self.assertEqual(room['cursor'], 42)
        self.assertEqual(room['annotations'][0]['author'], 'Reviewer')

    def test_author_cannot_approve_and_stale_approval_rejected(self):
        old = self.propose()
        with self.assertRaises(Problem) as context:
            self.store.mutate(self.id, self.author, 'approve', {'proposal_id': old})
        self.assertEqual(context.exception.status, 403)
        new = self.propose()
        with self.assertRaises(Problem):
            self.approve(old)
        self.approve(new)
        self.assertEqual(self.room()['proposal']['approved_by']['name'], 'Reviewer')

    def test_validation_requires_approval_and_rejects_duplicates(self):
        proposal = self.propose()
        with self.assertRaises(Problem):
            self.store.queue_job(self.id, self.author, 'validate', {'proposal_id': proposal})
        self.approve(proposal)
        queued = self.store.queue_job(self.id, self.author, 'validate', {'proposal_id': proposal})
        with self.assertRaises(Problem):
            self.store.queue_job(self.id, self.reviewer, 'validate', {'proposal_id': proposal})
        with self.assertRaises(Problem):
            self.propose()
        with patch.dict('os.environ', {'SIM_SOURCE': '', 'SIM_PYTHON': ''}):
            result = validate(queued)
        self.assertEqual(result['mode'], 'recorded')
        self.assertEqual(len(result['seeds']), 1)
        self.store.job_update(self.id, queued['job']['id'], 'complete', result=result)
        self.assertEqual(self.room()['proposal']['status'], 'validated')

    def test_revision_clears_approval_and_results(self):
        self.approve(self.propose())
        self.propose()
        self.assertIsNone(self.room()['proposal']['approved_by'])
        self.assertIsNone(self.room()['validation'])

    def test_unknown_or_unsafe_parameters_rejected(self):
        for fix in ({'tunable':'slip_impulse_n','value':0}, {'tunable':'balance_assist_scale','value':True},
                    {'tunable':'balance_assist_scale','value':2}, {'tunable':'boot_traction_enabled','value':'false'}):
            with self.subTest(fix=fix), self.assertRaises(Problem):
                valid_fix(fix)

    def test_concurrent_comments_are_not_lost(self):
        def add(index):
            self.store.mutate(self.id, self.author, 'message', {'text': f'Observation {index}'})
        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(add, range(20)))
        self.assertEqual(len(self.room()['messages']), 20)

    def test_restart_preserves_history_and_marks_interrupted_job(self):
        proposal = self.propose()
        self.approve(proposal)
        self.store.queue_job(self.id, self.author, 'validate', {'proposal_id': proposal})
        self.store.recover_jobs()
        self.assertEqual(self.room()['job']['status'], 'failed')
        self.assertEqual(self.room()['proposal']['status'], 'approved')
        again = Store(self.tmp.name + '/rooms.sqlite3')
        self.assertEqual(again.read(self.id, self.author)['proposal']['id'], proposal)
        again.db.close()

    def test_recorded_mode_does_not_fabricate_unseen_fix(self):
        self.store.mutate(self.id, self.author, 'propose', {
            'fix': {'tunable':'balance_assist_scale','value':.8}, 'reason':'Alternative hypothesis'})
        with patch.dict('os.environ', {'SIM_SOURCE':'','SIM_PYTHON':''}), self.assertRaises(Problem):
            validate(self.room())

    def test_duplicate_name_cannot_impersonate_reviewer(self):
        with self.assertRaises(Problem):
            self.store.join(self.id, 'reviewer')


if __name__ == '__main__':
    unittest.main()
