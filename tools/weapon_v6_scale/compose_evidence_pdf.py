"""Lay out unmodified render images in an evidence document; renderer output is not retouched."""
from pathlib import Path
from reportlab.pdfgen.canvas import Canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'web/motion-labs/verification_weapon_v6_scale'
pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
c=Canvas(str(OUT/'M870_final_evidence.pdf'),pagesize=(740,1100));c.setTitle('M870 final 1 m thinner-body evidence')
H=2200
def page(h):
 global H
 H=h;c.setPageSize((740,h/2));c.scale(.5,.5);c.setFillColorRGB(.955,.962,.972);c.rect(0,0,1480,h,stroke=0,fill=1)
def text(s,x,y,size=23,color=(.12,.17,.22)):
 c.setFillColorRGB(*color);c.setFont('STSong-Light',size);c.drawString(x,H-y-size,s)
def image(name,x,y,w,h):c.drawImage(str(OUT/name),x,H-y-h,w,h,preserveAspectRatio=False)
def label(s,x,y):
 c.setFillColorRGB(.98,.985,.99);c.rect(x,H-y-37,max(180,len(s)*21),37,fill=1,stroke=0);text(s,x+10,y+3,22)
page(2200)
text('M870 最终版：全长 1 m，枪身更薄',40,26,36)
text('总宽 68.452 → 60.238 mm（缩窄 12%），高度 211.569 mm 不变。',40,80,24)
text('机匣、枪托、护木等压窄；圆枪管、管帽与下方圆管保持原截面。',40,118,22)
text('同机位俯视 / Same-camera top view',40,175,26)
image('M870_before_thinning-top.png',40,220,1400,360);label('修改前 / 1 m',56,232)
image('M870_final-top.png',40,594,1400,360);label('最终版 / 1 m',56,606)
text('侧面长度与高度保持 / Side profile preserved',40,978,26)
image('M870_final-side.png',40,1022,1400,360);label('最终版 / 长 1000.000 mm',56,1034)
text('同机位正视 / Same-camera front view',40,1408,26)
image('M870_before_thinning-front.png',90,1454,600,600);label('修改前',106,1466)
image('M870_final-front.png',790,1454,600,600);label('最终版 / 枪管未压扁',806,1466)
text('相同正交镜头、坐标与倍率。原精修文件、二进制几何、材质与 UV 保留。',40,2090,21)
text('原 M97 长 999.240 mm，仅作历史参照；最终目标按最新要求为 1000.000 mm。',40,2128,21)
c.showPage()
page(1590)
text('M870 护木、管帽与拉泵装配检查',40,26,36)
text('护木独立沿枪轴拉泵 75 mm。圆管与前帽保持不动。',40,82,24)
image('M870_final-pump-junction.png',40,140,690,483);label('前止点 / Rest',56,152)
image('M870_final_pump_max-pump-junction.png',750,140,690,483);label('后止点 / Full stroke',766,152)
text('同机位俯视，两端点',40,650,26)
image('M870_final-top.png',40,696,1400,360);label('前止点',56,708)
image('M870_final_pump_max-top.png',40,1070,1400,360);label('后止点',56,1082)
text('护木宽 49.964 mm；前帽宽 49.376 mm，保留原来的非对称小凸缘。',40,1460,21)
text('全行程 21 个采样点验证：Static_visual 不动，Pump_visual 仅沿枪轴移动。',40,1498,21)
c.showPage()
page(1800)
text('原 M97 与 M870 最终版：同轴、同机位',40,26,36)
text('原 M97：999.240 mm；M870 最终版：1000.000 mm，按最新要求定长。',40,82,24)
text('此处是尺寸和轮廓证据，不把 Hawk 当作 M97。',40,120,22)
text('侧视 / Side view',40,177,26)
image('M97_reference-side.png',40,220,1400,360);label('原 M97',56,232)
image('M870_final-side.png',40,594,1400,360);label('M870 最终版',56,606)
text('俯视 / Top view',40,978,26)
image('M97_reference-top.png',40,1022,1400,360);label('原 M97 / 宽 44.000 mm',56,1034)
image('M870_final-top.png',40,1396,1400,360);label('M870 最终版 / 宽 60.238 mm',56,1408)
c.showPage();c.save()
print(OUT/'M870_final_evidence.pdf')
