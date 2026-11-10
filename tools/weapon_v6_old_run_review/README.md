# Linxu old-longgun Run / Before QA

Read-only QA for QBZ95, Type56-1, QBU85, Type97Hawk and QCQ171: ten real UI `RifleRun` / `RifleRun_Before` states. No production edits, push, deployment or upload.

## Small delivery bundle

Ship only `web/motion-labs/verification_weapon_v6_old_run_review/evidence/` as visual/report evidence. It contains the report, coverage, necessary numeric and baseline provenance summaries, SHA-256 checksums and ten contact sheets. It contains no baked GLBs, raw frames, or temporary site snapshots. Larger working artifacts are not required to read the report.

## Required inputs

1. Complete current Linxu site, default `<repository>/web/motion-labs/linxu-motion-lab`, including runtime imports, config, character/motion packs and all configured weapon GLBs.
2. **Original baseline is mandatory.** Default baseline repository root is `<repository>/../character_adapt_baseline`, containing the original `web/motion-labs/linxu-motion-lab` tree from Git `81d5a48`. Preserve original runtime/config and materialize actual Git LFS assets. This baseline is not shipped in `evidence/`. Never substitute current production for it. Missing inputs and LFS pointer files cause explicit errors; there is no current-source fallback.
3. Node.js 20+ and project package `three@0.180.0`. Numeric checks do not need a browser, Blender, Python, or another QA tool folder.

All default paths derive from script location, not the shell working directory. Keep this folder at `tools/weapon_v6_old_run_review/` in the project.

## Path configuration

- `LINXU_OLD_RUN_SITE`: optional review **site directory**, absolute or repository-relative. Omit for current production. To inspect a preserved frozen site, explicitly supply its path. No snapshot is assumed or required.
- `WEAPON_V6_BASELINE`: original baseline **repository root**, absolute or repository-relative. Default `../character_adapt_baseline`.
- `LINXU_OLD_RUN_OUTPUT`: output directory, absolute or repository-relative. Default `web/motion-labs/verification_weapon_v6_old_run_review`. Prefer a fresh directory for reruns to preserve historic evidence.

Example from repository root:

```sh
LINXU_OLD_RUN_OUTPUT=work/old-run-recheck node tools/weapon_v6_old_run_review/export_and_audit.mjs
LINXU_OLD_RUN_OUTPUT=work/old-run-recheck node tools/weapon_v6_old_run_review/check_semantics.mjs
```

Explicit original baseline and optional frozen site:

```sh
WEAPON_V6_BASELINE=/path/to/original-baseline-repo \
LINXU_OLD_RUN_SITE=/path/to/preserved-linxu-site \
LINXU_OLD_RUN_OUTPUT=work/old-run-frozen-check \
node tools/weapon_v6_old_run_review/export_and_audit.mjs
```

The auditor defaults to **numeric-only**: ten UI branches ×161 phases, 312 distinct Bone objects plus weapon roots, and clip-track equality. It exits with status 2 on any nonzero transform or source-track mismatch. No mesh baking or rendering occurs by default. `check_semantics.mjs` reports Before differences and loop seams.

## Minimum tool set

Numeric reproduction needs only `runtime.mjs`, `export_and_audit.mjs`, and `check_semantics.mjs`, plus Node/Three and the current/original sites described above. They do not import other QA tool folders, snapshots or private scratch paths. The application's own imports/assets remain required.

## Optional rendering and assembly

Not needed to read the evidence; not performed during delivery cleanup. To regenerate fresh images, additionally retain `bake_runtime.mjs`, `render.py`, and `package.py`. Run auditor with `--bake`, then `blender -b -t 2 -P tools/weapon_v6_old_run_review/render.py`, then `python tools/weapon_v6_old_run_review/package.py`, using the same output variable for every step. This adds Blender CPU Cycles and Python/Pillow. FFmpeg is only needed for optional continuous videos. Scene FPS is set to 240 before GLB import.

Historic sheets reuse the already running 270-frame render with matching production inputs; no duplicate rendering was started. `package_legacy.py` and `finalize_report.py` are optional archival assembly helpers, not needed for delivery or numeric reruns. They require explicit `LINXU_OLD_RUN_LEGACY_SOURCE` pointing to archived legacy frames/manifests instead of assuming an unshipped directory. `package_evidence.py` builds the small bundle from completed reports/sheets under the configured output, using Python standard library only.

## Limits

Real textured skinned surfaces, nine phases × front/left/back, upper-body framing. Some long barrel tips and feet are outside the frame. Not browser-pixel acceptance, every-frame coverage or proof against hidden microscopic intersections. Before is the actual UI branch with attachment IK, not a raw/no-IK control. Baseline equivalence means motion preservation, not that every old artistic choice is ideal.
