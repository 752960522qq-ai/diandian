import json,numpy as np,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from scipy.interpolate import CubicSpline
from pathlib import Path
O=Path('web/motion-labs/verification_weapon_v6_jitter');font_manager.fontManager.addfont('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc');plt.rcParams['font.family']='Noto Sans CJK JP';plt.rcParams['axes.unicode_minus']=False
j=json.loads((O/'walk-source.json').read_text());p=json.loads((O/'walk-candidates.json').read_text());selected=next(c for c in p['candidates']if c['id']==p['selected']);t=np.array(selected['times']);sp=CubicSpline(t,selected['worldCorrection'],bc_type='periodic');dense=np.linspace(0,t[-1],1401);raw=np.array([r['normalBobWorldY']for r in j['rows']]);old=np.array([r['addedFloorCorrectionWorldM']for r in j['rows']]);actual=np.array([r['currentWorldY']for r in j['rows']]);raw_y=np.interp(dense,t,raw);new_y=raw_y+sp(dense)
fig,axs=plt.subplots(3,1,figsize=(12,10),constrained_layout=True);a=axs[0];a.plot(dense,(raw_y-np.mean(raw_y))*1000,color='#708090',label='原动作正常上下起伏（仅移至同一均值）');a.plot(t,(actual-np.mean(actual))*1000,color='#d65b45',label='原站 / v5');a.plot(dense,(new_y-np.mean(new_y))*1000,color='#268b83',label='最小候选');a.set_ylabel('臀部上下变化 / mm');a.set_title('林叙 Walk：保留原始步态，只平滑贴地补偿');a.legend(loc='upper right');a.grid(alpha=.2)
a=axs[1];a.plot(t,old*1000,'o-',ms=2,color='#d65b45',label='旧补偿：三帧最大值包络 + 线性插值');a.plot(dense,sp(dense)*1000,color='#268b83',label='候选：周期 C2 补偿 + 0.338 mm 安全余量');a.set_ylabel('额外贴地抬高 / mm');a.legend(loc='upper right');a.grid(alpha=.2)
a=axs[2];a.plot(t[:-1],np.diff(old)/np.diff(t),color='#d65b45',label='旧补偿速度');a.plot(dense,sp(dense,1),color='#268b83',label='候选补偿速度（周期连续）');a.set_ylabel('仅补偿的垂直速度 / m/s');a.set_xlabel('同一原动作周期 / s');a.grid(alpha=.2);a.legend();fig.savefig(O/'walk-curves.png',dpi=140);plt.close(fig)
if not (O/'pistol-960hz-trajectories.json').exists():
 print('Walk plot ready; optional historical pistol spectrum input is absent.');raise SystemExit(0)
j=json.loads((O/'pistol-960hz-trajectories.json').read_text());t=np.array([r['t']for r in j]);z=np.array([r['nodes']['Gun']['p'][2]for r in j]);h=np.array([r['nodes']['Head']['p'][2]for r in j]);diag=json.loads((O/'diagnosis.json').read_text());fig,axs=plt.subplots(2,1,figsize=(12,7),constrained_layout=True);mask=t<.2
axs[0].plot(t[mask],(z[mask]-z[0])*1000,color='#d65b45',label='v5：枪根前后轨迹（960 Hz 实测）');axs[0].plot(t[mask],(h[mask]-h[0])*1000,color='#cd9a38',label='v5：头部前后轨迹');axs[0].plot([0,.2],[0,0],color='#268b83',label='源静态姿势 / v6：无此振动');axs[0].set_title('林叙手枪 Idle：3.1秒身体循环被压进0.033秒，产生30 Hz抖动');axs[0].set_ylabel('相对开始位置 / mm');axs[0].set_xlabel('真实时间 / s');axs[0].legend();axs[0].grid(alpha=.2)
freq=np.fft.rfftfreq(len(t),1/960);amp=np.abs(np.fft.rfft(z-z.mean()))*2/len(t)*1000;axs[1].bar(freq[:121],amp[:121],color='#d65b45',width=.8);axs[1].set_xlabel('频率 / Hz');axs[1].set_ylabel('枪根Z位移振幅 / mm');axs[1].set_title('主峰30 Hz。30fps恰好同相位抽样会漏检；60/120/240fps均可复现。');axs[1].grid(alpha=.2);fig.savefig(O/'pistol-jitter-spectrum.png',dpi=140);plt.close(fig)
print('PLOTS READY')
