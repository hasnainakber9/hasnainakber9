"""Build four data-meme GIF comps in one EffectCraft project via `run --args-file`."""
import json, math, os, random, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EC = open(os.path.join(HERE, 'ec_path.txt')).read().strip()
PROJ = os.path.join(HERE, 'gifs.ecproj')
ENV = dict(os.environ, EFFECTCRAFT_FONT_DIRS=os.path.join(HERE, '..', 'memes2', 'fonts'))

BG = '#0b1320'; WHITE = '#ffffff'; GREY = '#8a96a8'; GOLD = '#ffc94d'; GREEN = '#3ddc84'
steps = []
def cmd(cid, **p): steps.append((cid, p))

def comp(name, dur):
    cmd('comp.new', name=name, width=1080, height=1080, frameRate=30, duration=dur, background=BG)

def text(name, s, size, pos, fill=WHITE, font='Anton', style='Regular', justify='center'):
    cmd('layer.newText', text=s, name=name, size=size, fill=fill, position=pos, font=font, style=style)
    if justify != 'center':
        cmd('layer.setText', layer=name, justify=justify)

def shape(name, kind, size, pos, fill):
    cmd('layer.newShape', kind=kind, name=name, size=size, position=pos, fill=fill)

def key(layer, path, t, v):
    cmd('prop.addKey', layer=layer, path=path, time=t, value=v)

def expr(layer, path, e):
    cmd('prop.setExpression', layer=layer, path=path, expression=e)

def captions(prefix, top, bottom, source, tsize=66, bsize=58):
    text(prefix + 'Top', top, tsize, [540, 110])
    text(prefix + 'Bottom', bottom, bsize, [540, 985], fill=GOLD)
    text(prefix + 'Src', source, 24, [540, 1050], fill=GREY, font='Inter', style='Regular')

# helper JS: thousands separator + eased progress
FMT = 'function f(n){return Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");}'
def ease(t0, t1):  # cubic ease-out progress 0..1 between comp times t0..t1
    return f'var p=Math.min(1,Math.max(0,(time-{t0})/({t1}-{t0}))); p=1-Math.pow(1-p,3);'

# ---------------------------------------------------------------- 1. POLIO
comp('Polio', 6)
captions('P', 'HUMANITY INSTALLING A POLIO-FREE WORLD', 'STUCK AT 99.97%, LIKE EVERY DOWNLOAD EVER',
         'Wild polio: ~350,000 cases (1988) to 99 cases (2024). Global Polio Eradication Initiative')
shape('PWin', 'rounded', [880, 470], [540, 540], '#e8edf3')
shape('PTitle', 'rect', [880, 70], [540, 340], '#2f6fde')
text('PTitleT', 'Installing: World Without Polio', 34, [540, 352], font='Inter', style='SemiBold')
shape('PTrack', 'rect', [760, 64], [540, 520], '#c3ccd8')
shape('PFill', 'rect', [760, 64], [540, 520], GREEN)
text('PPct', '0%', 44, [540, 610], fill='#14202e', font='Inter', style='Bold')
text('PYear', '1988', 32, [540, 670], fill='#3a4a5e', font='Inter', style='Medium')
text('PStat', '', 30, [540, 720], fill='#3a4a5e', font='Inter', style='Regular')
# cases fall on a log scale: the bar races to 99% and then crawls
CASES = ease(0.4, 3.2) + 'var c=Math.exp(Math.log(350000)+p*(Math.log(99)-Math.log(350000)));'
expr('PFill', 'transform/scale', CASES + 'var k=(1-c/350000); [k*100,100]')
expr('PFill', 'transform/position', CASES + 'var k=(1-c/350000); [160+380*k,520]')
expr('PPct', 'text/sourceText', CASES + 'var k=Math.max(0,(1-c/350000)*100); (k>99.9?k.toFixed(2):k.toFixed(1))+"%"')
expr('PYear', 'text/sourceText', ease(0.4, 3.2) + FMT + 'var c=f(Math.exp(Math.log(350000)+p*(Math.log(99)-Math.log(350000)))); time<0.4?"1988: 350,000 cases a year":(time<3.2?"cases a year: "+c:"2024: 99 cases")')
expr('PStat', 'text/sourceText', 'time<3.3?"Downloading vaccines...":(Math.floor(time*2)%2==0?"Finishing up: 2 countries remaining...":"")')
for n in ['PWin', 'PTitle', 'PTitleT', 'PTrack', 'PFill', 'PPct', 'PYear', 'PStat']:
    key(n, 'transform/opacity', 0, 0); key(n, 'transform/opacity', 0.35, 100)

# ---------------------------------------------------------------- 2. VOYAGER
comp('Voyager', 6)
random.seed(7)
for i in range(70):
    s = random.choice([3, 3, 4, 5, 6])
    shape(f'VStar{i}', 'ellipse', [s, s], [random.randint(10, 1070), random.randint(180, 900)], '#c9d6ff')
    expr(f'VStar{i}', 'transform/opacity', f'{random.randint(35, 90)}+20*Math.sin(time*{random.uniform(1, 3):.2f}+{i})')
shape('VEarth', 'ellipse', [90, 90], [150, 560], '#3d7bff')
text('VEarthL', 'EARTH', 28, [150, 650], fill='#9fb7ff', font='Inter', style='SemiBold')
shape('VLine', 'rect', [760, 3], [535, 560], '#2b3a55')
shape('VProbe', 'rect', [26, 26], [915, 560], WHITE)
cmd('prop.set', layer='VProbe', path='transform/rotation', value=45)
expr('VProbe', 'transform/position', '[915+time*6,560]')
text('VProbeL', 'VOYAGER 1', 28, [920, 515], fill=WHITE, font='Inter', style='SemiBold')
shape('VPulse', 'ellipse', [18, 18], [900, 560], GOLD)  # signal travelling home
expr('VPulse', 'transform/position', 'var q=(time%2)/2; [915-765*q,560]')
expr('VPulse', 'transform/opacity', 'var q=(time%2)/2; q<0.95?100:0')
text('VLab', 'TIME FOR ITS SIGNAL TO REACH US', 30, [540, 745], fill=GREY, font='Inter', style='SemiBold')
text('VClock', '23h 57m 00s', 96, [540, 840], font='Anton')
expr('VClock', 'text/sourceText', ease(0.3, 4.0) + 'var s=Math.round(86220+p*180); var h=Math.floor(s/3600), m=Math.floor(s%3600/60), ss=s%60; function z(x){return (x<10?"0":"")+x;} h+"h "+z(m)+"m "+z(ss)+"s"')
expr('VClock', 'transform/scale', 'time>4.0&&time<4.4?[100+15*Math.sin((time-4)*7.8),100+15*Math.sin((time-4)*7.8)]:[100,100]')
cmd('layer.newText', text='ONE LIGHT-DAY FROM HOME', name='VFlag', size=60, fill=GOLD, position=[540, 320], font='Anton', style='Regular')
key('VFlag', 'transform/opacity', 0, 0); key('VFlag', 'transform/opacity', 4.0, 0); key('VFlag', 'transform/opacity', 4.3, 100)
captions('V', 'VOYAGER 1, 49 YEARS INTO A ONE-WAY TRIP', 'STILL REPLYING. JUST 24 HOURS LATE.',
         'Launched 1977. Reaches one light-day from Earth on 18 Nov 2026 (NASA)')

# ---------------------------------------------------------------- 3. GENOME
comp('Genome', 6)
for i in range(22):  # rotating double helix
    for strand in (0, 1):
        n = f'GH{i}_{strand}'
        shape(n, 'ellipse', [22, 22], [200, 230 + i * 30], '#59c3ff' if strand == 0 else '#ff7aa8')
        ph = i * 0.45 + strand * math.pi
        expr(n, 'transform/position', f'[200+100*Math.sin(time*2.2+{ph:.3f}),{230 + i * 30}]')
        expr(n, 'transform/scale', f'var d=50+50*Math.cos(time*2.2+{ph:.3f}); [55+d*0.6,55+d*0.6]')
        expr(n, 'transform/opacity', f'45+55*(0.5+0.5*Math.cos(time*2.2+{ph:.3f}))')
text('GLab', 'COST TO READ ONE HUMAN GENOME', 32, [690, 330], fill=GREY, font='Inter', style='SemiBold')
text('GPrice', '$95,000,000', 100, [690, 470])
G = ease(0.5, 3.8) + 'var c=Math.exp(Math.log(95000000)+p*(Math.log(500)-Math.log(95000000)));'
expr('GPrice', 'text/sourceText', G + FMT + '"$"+f(c<1000?Math.round(c/10)*10:c)')
text('GYear', '2001', 64, [690, 590], fill=WHITE, font='Inter', style='Bold')
expr('GYear', 'text/sourceText', 'time<0.5?"2001":(time<3.8?"...":"2022")')
text('GNote', 'Sanger sequencing, 13-year project', 30, [690, 660], fill=GREY, font='Inter', style='Regular')
expr('GNote', 'text/sourceText', 'time<0.5?"The Human Genome Project era":(time<3.8?"next-gen sequencing arrives...":"About a day on one machine")')
cmd('layer.newText', text='CHEAPER THAN A NEW PHONE', name='GFlag', size=54, fill=GREEN, position=[690, 760], font='Anton', style='Regular')
key('GFlag', 'transform/opacity', 0, 0); key('GFlag', 'transform/opacity', 3.8, 0); key('GFlag', 'transform/opacity', 4.2, 100)
captions('G', 'MOORE\'S LAW HAS ENTERED THE CHAT', 'GENOMES GOT 190,000x CHEAPER IN 21 YEARS',
         'NHGRI cost-per-genome estimates: ~$95M (2001) to ~$500 (2022)')

# ---------------------------------------------------------------- 4. CHILD DEATHS
comp('Children', 7)
COLS, ROWS, GAP = 16, 8, 52
x0 = 540 - (COLS - 1) * GAP / 2; y0 = 330
idx = list(range(128)); random.seed(3); random.shuffle(idx)
vanish = set(idx[:79])  # 128 dots (12.8M, 1990) -> 49 dots (4.9M, 2022)
for k in range(128):
    r, c = divmod(k, COLS)
    n = f'CD{k}'
    shape(n, 'ellipse', [34, 34], [x0 + c * GAP, y0 + r * GAP], '#ff8a5c')
    key(n, 'transform/opacity', 0, 0); key(n, 'transform/opacity', 0.25 + k * 0.006, 100)
    if k in vanish:
        t = 2.0 + idx.index(k) * 0.028
        key(n, 'transform/opacity', t, 100); key(n, 'transform/opacity', t + 0.35, 12)
text('CYear', '1990: 12.8 MILLION', 70, [540, 790])
expr('CYear', 'text/sourceText', 'time<2.0?"1990: 12.8 MILLION":(time<4.6?"...":"2022: 4.9 MILLION")')
text('CSub', 'each dot = 100,000 children who died before age 5', 28, [540, 860], fill=GREY, font='Inter', style='Regular')
captions('C', 'KIDS WHO DIED BEFORE AGE 5, PER YEAR', 'EVERY FADED DOT: 100,000 KIDS WHO GREW UP',
         'UN IGME 2024: 12.8M (1990) to 4.9M (2022), a record low', tsize=60, bsize=52)

# ---------------------------------------------------------------- write + run
args = []
for cid, p in steps:
    args += [cid, json.dumps(p)]
open(os.path.join(HERE, 'build_args.txt'), 'w').write('\n'.join(args) + '\n')
r = subprocess.run([EC, 'run', '--empty', '--save-as', PROJ, '--args-file', os.path.join(HERE, 'build_args.txt'), '--json'],
                   capture_output=True, text=True, env=ENV)
print('exit', r.returncode, 'steps', len(steps)); print(r.stdout[-600:], r.stderr[-1500:])
