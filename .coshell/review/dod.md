# Definition of done

- Two independently joined participants share the same persisted room state.
- The proposer cannot approve their own proposal; a revision clears approvals and results.
- Each simulation job validates the exact approved proposal and only changes allowlisted robot settings.
- Recorded reports/results never claim fresh execution or broader validation.
- No credentials, local room state, or private environment files enter Git.
- `npm test`, `npm run build`, and `npm run test:e2e` pass.
- Record actual Coshell session history separately from app activity exports.
