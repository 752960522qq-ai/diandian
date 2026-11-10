"""QA-only: smooth the additive ground correction, never the source Hips.y signal."""
import json, numpy as np
from pathlib import Path
from scipy.ndimage import gaussian_filter1d
from scipy.interpolate import CubicSpline
OUT=Path('web/motion-labs/verification_weapon_v6_jitter')
j=json.loads((OUT/'walk-source.json').read_text()); rows=j['rows']; duration=1.1666666269302368
# Original Float32 glTF key times are used for final construction, supplied separately below.
t=np.array([r['t'] for r in rows],dtype=np.float32).astype(float); old=np.array([r['addedFloorCorrectionWorldM'] for r in rows]); old[-1]=old[0]
floor=j['floorRows']; tf=np.array([r['t'] for r in floor]); raw_floor=np.array([r['rawFloor']for r in floor]); candidates=[]
for sigma in [.6,1.0,1.5,2.0]:
 y=gaussian_filter1d(old[:-1],sigma,mode='wrap'); y=np.r_[y,y[0]]; sp=CubicSpline(t,y,bc_type='periodic')
 # Minimum constant sufficient for measured floor + 0.2mm dense-sampling safety margin.
 extra=max(0,float(np.max(.0027-raw_floor-sp(tf)))); y+=extra;sp=CubicSpline(t,y,bc_type='periodic')
 dense=np.linspace(0,duration,1401); orig=np.interp(dense,t,old); diff=sp(dense)-orig
 candidates.append({'id':f'sigma_{sigma:g}', 'sigmaFramesAt60Hz':sigma,'addedConstantWorldM':extra,'maxAddedWorldM':float(diff.max()),'maxRemovedWorldM':float(-diff.min()),'maxAbsChangeWorldM':float(np.max(abs(diff))),'minFloorAt120HzM':float(np.min(raw_floor+sp(tf))),'maxCorrectionVelocityMps':float(np.max(abs(sp(dense,1)))),'maxCorrectionAccelerationMps2':float(np.max(abs(sp(dense,2)))),'correctionPositionSeamM':float(abs(sp(0)-sp(duration))),'correctionVelocitySeamMps':float(abs(sp(0,1)-sp(duration,1))),'correctionAccelerationSeamMps2':float(abs(sp(0,2)-sp(duration,2))),'times':t.tolist(),'worldCorrection':y.tolist(),'worldCorrectionDerivatives':sp(t,1).tolist(),'dense':{'times':dense.tolist(),'worldCorrection':sp(dense).tolist()}})
result={'method':'Periodic Gaussian smoothing of ONLY historical additive floor-lift curve; periodic C2 cubic interpolation. Add the smallest nonnegative constant to meet 2.7mm sampled sole clearance. Source motion cadence, every rotation, Hips.x/z and original Hips.y bob are kept. No production files touched.','selected':'sigma_1','candidates':candidates}
(OUT/'walk-candidates.json').write_text(json.dumps(result,indent=2))
for r in candidates:print({k:v for k,v in r.items() if k not in ('times','worldCorrection','worldCorrectionDerivatives','dense')})
