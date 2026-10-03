"""Optional adapter to the original simulation. No LLM calls or issue publishing."""
import contextlib
import json
import os
import pathlib
import sys


def main():
    request = json.load(sys.stdin)
    source = pathlib.Path(os.environ["SIM_SOURCE"]).resolve()
    sys.path.insert(0, str(source))
    os.chdir(source)
    with contextlib.redirect_stdout(sys.stderr):
        import incident_loop as sim
        import torch
        # Small policy inference is faster with one CPU thread; many threads
        # spend more time coordinating than evaluating this network.
        torch.set_num_threads(1)
        policy = sim.PPO.load(str(source / "models/ppo_fixed_line_slope/g1_fixed_line_final.zip"), device="cpu")
        pairs, telemetry_after = [], []
        for seed in request["seeds"]:
            before_env = sim.make_env(request["scenario"], 700.0)
            try:
                before, _ = sim.rollout_with_log(before_env, policy, seed)
            finally:
                before_env.close()
            after_env = sim.make_env(request["scenario"], 700.0)
            try:
                sim.apply_fix(after_env, request["fix"])
                after, log = sim.rollout_with_log(after_env, policy, seed)
            finally:
                after_env.close()
            if not telemetry_after:
                telemetry_after = log
            pairs.append({"seed": seed, "before": before, "after": after})
    passed = all(p["after"]["success"] for p in pairs) and any(not p["before"]["success"] for p in pairs)
    print(json.dumps({"seeds": pairs, "passed": passed, "telemetry_after": telemetry_after}))


if __name__ == "__main__":
    main()
