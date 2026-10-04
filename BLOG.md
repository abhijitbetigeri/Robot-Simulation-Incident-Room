# From Failed Robot Runs to Reviewed Fixes

A robot stops making progress on a slope. The simulation has recorded its movement, balance, and contact with the ground. There is plenty of data to inspect. What the team still needs is a decision: what should change, who should review it, and what evidence would show that the change helped?

That is the problem behind **Robot Simulation Incident Room**, a shared workspace for robotics and Physical AI engineers investigating simulation failures.

The product connects the steps between noticing a failure and deciding what to do next. Engineers can inspect the same telemetry, pin observations, discuss a diagnosis, propose a specific fix, and ask another participant to review it. The investigation stays connected to the resulting comparison.

Consider the incident in our demo: a Unitree G1 humanoid climbing a slope in MuJoCo loses uphill progress. One engineer might focus on its balance. Another might question whether the robot can generate enough traction. Both observations need to refer to the same run and the same moment before they can support a useful decision.

In Incident Room, a shared playhead gives the team that common starting point. When one participant moves through the telemetry, the others see the selected step. An engineer can pin an observation directly to it, keeping the discussion close to the evidence.

“The robot is struggling” becomes a more useful statement: “At this step, uphill progress is near zero. Is boot traction enabled?”

The next step is turning that observation into a reviewable proposal. In the demo, a recorded analyst report identifies disabled boot traction as a likely cause. The engineer proposes enabling it and explains why, while keeping the test conditions unchanged.

This is where the product makes a deliberate choice: **the participant who proposes a fix cannot approve it.**

Another participant must review the change. They can inspect the same evidence, add context in the shared discussion, and decide whether the proposal is ready for validation. If the configuration changes after approval, the previous approval and validation results are cleared. The revised proposal needs another review.

This gives approval a specific meaning. It applies to the change the reviewer actually saw. It also keeps approval separate from success: agreeing that a hypothesis deserves testing does not mean the hypothesis has been proved.

That distinction became especially useful when we tested the optional live simulation worker locally. We compared the original configuration with the traction fix across three matching simulation seeds. The fixed configuration succeeded on two seeds. On the third, the episode reached its time limit without satisfying the simulator's success criterion.

The aggregate validation did not pass.

That result is part of the product story. A single successful example can make a change look convincing. A comparison across additional conditions gives the team a better basis for deciding whether to accept it, investigate further, or revise the proposal. Incident Room preserved the incomplete result instead of turning partial recovery into a blanket success claim.

After the review, the investigation remains available. The activity history records who proposed the change, who approved it, and which comparison was examined. Engineers can export the evidence for a follow-up discussion or handoff. The intended benefit is less time reconstructing the reasoning behind a decision when someone returns to the incident later.

The current release is a focused prototype. Its public demo runs on Freestyle and supports live shared rooms, telemetry navigation, evidence annotations, discussion, proposal review, and evidence export. The cloud demo uses clearly labeled historical telemetry, AI diagnoses, and simulation results from my earlier robot-incident-analyst project. It does not execute fresh inference or simulation. The live simulation adapter was tested separately in the local environment.

The prototype also uses participant names and browser identities rather than verified employee accounts. Its approval mechanism demonstrates separation between participants; production use would need stronger identity and organization controls. Simulation results remain evidence about the tested conditions, not a guarantee of behavior on physical hardware.

For teams evaluating robots, the product direction is straightforward: make each failed run easier to investigate together, and make each proposed fix easier to question, review, and reproduce. The shared workflow is designed to keep the evidence, the configuration change, and the people making the decision in one place.

You can try that workflow in the [live Incident Room](https://robot-simulation-incident-room-ab.style.dev). Create a room, invite another participant, and work through the traction example. For a quick walkthrough, watch the [60-second narrated demo](https://github.com/abhijitbetigeri/Robot-Simulation-Incident-Room/blob/main/submission/demo.mp4).

**Every proposed fix should come with a reason, a review, and evidence of what happened next.**
