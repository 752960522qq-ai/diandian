# Old-longgun run QA evidence

This small standalone bundle contains REPORT.md, coverage-and-findings.json, numeric-summary.json, source-and-baseline.json, and 10 contact sheets. It includes no baked meshes, raw frame directories, temporary runtime snapshots, or software dependencies. Open the report and sheets directly.

The original visual review used real runtime poses with actual UI Before branches, 9 phases × 3 views × 10 states = 270 images. The post-cleanup numerical recheck uses default current production. These are sampled/source-relative findings, not an absolute guarantee.

To rerun numerical checks, use tools/weapon_v6_old_run_review/{runtime.mjs,export_and_audit.mjs,check_semantics.mjs} in the project, Node.js and three@0.180.0. The current site and original81d5a48 baseline site with materialized GLBs are required. The baseline is not included here and must not be silently substituted with current assets. See the tools README for paths and commands.
