from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np, math, random, os
R=random.Random(2116)
out='/mnt/data/nautilus_v2_textures'

def backdrop(w,h,kind):
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32); nx=xx/w; ny=yy/h
    if kind=='header':
        top=np.array([4,30,54],float); bot=np.array([1,19,37],float)
        # bright upper center/right; leave text-safe low-contrast left 36%
        spot=np.exp(-((nx-0.64)/0.27)**2 - ((ny+0.05)/0.64)**2)*0.9
        spot2=np.exp(-((nx-0.94)/0.21)**2 - ((ny-0.18)/0.64)**2)*0.24
        bright=(spot+spot2)*(0.16+0.84*np.clip((nx-0.23)/0.35,0,1))
    else:
        top=np.array([5,33,58],float); bot=np.array([1,17,34],float)
        bright=np.exp(-((nx-0.88)/0.35)**2 - ((ny-0.11)/0.30)**2)*0.38 + np.exp(-((nx+0.3)/0.8)**2-((ny-0.45)/0.8)**2)*0.09
    base=top[None,None,:]*(1-ny[:,:,None])+bot[None,None,:]*ny[:,:,None]
    tint=np.array([12,88,129])
    base=base+(tint-base)*bright[:,:,None]
    # very low contrast cloud texture, fades behind content
    rng=np.random.default_rng(2027 if kind=='header' else 2028)
    nw,nh=max(10,w//90),max(12,h//90)
    noise=rng.normal(128,26,(nh,nw)).clip(0,255).astype('uint8')
    noim=Image.fromarray(noise,'L').resize((w,h),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(9))
    nn=(np.asarray(noim,dtype=np.float32)-128)/128
    intensity=(3 if kind=='header' else 2)
    base=np.clip(base+nn[:,:,None]*intensity,0,255).astype('uint8')
    return Image.fromarray(base,'RGB').convert('RGBA')

def beam_layer(w,h,kind):
    im=Image.new('RGBA',(w,h),(0,0,0,0)); dr=ImageDraw.Draw(im,'RGBA')
    if kind=='header':
        sx,sy=int(w*0.69),-int(h*.05)
        for j in range(23):
            q=(j-11)/11
            spread=q*.95*w
            pts=[(sx+j*5-18,sy), (sx+j*5+20,sy), (int(sx+spread+80),h),(int(sx+spread-70),h)]
            dr.polygon(pts,fill=(58,163,210,int(23+21*(1-abs(q)))))
    else:
        sx,sy=int(w*.84),-20
        for j in range(14):
            q=(j-7)/7
            pts=[(sx+j*4-14,sy),(sx+j*4+14,sy),(int(sx+q*w*.9+85),int(h*.78)),(int(sx+q*w*.9-85),int(h*.78))]
            dr.polygon(pts,fill=(48,143,196,int(16+14*(1-abs(q)))))
    return im.filter(ImageFilter.GaussianBlur(max(14,w//120)))

def fish(im,x,y,s,alpha=30,flip=1):
    dr=ImageDraw.Draw(im,'RGBA')
    c=(2,16,32,alpha)
    # small organic silhouette, not a generic triangle token
    dr.ellipse((x-s*.5,y-s*.22,x+s*.5,y+s*.22),fill=c)
    pts=[(x-s*.35*flip,y),(x-s*.95*flip,y-s*.32),(x-s*.95*flip,y+s*.32)]
    dr.polygon(pts, fill=c)
    dr.polygon([(x-s*.12,y-s*.1),(x+s*.08,y-s*.37),(x+s*.23,y-s*.13)],fill=c)

def branch(dr,base_x,base_y,angle,length,depth,width,color,rng):
    if depth<=0 or length<5:return
    end_x=base_x+math.cos(angle)*length;end_y=base_y+math.sin(angle)*length
    dr.line((base_x,base_y,end_x,end_y),fill=color,width=max(1,int(width)),joint='curve')
    if depth>1:
        branch(dr,end_x,end_y,angle+rng.uniform(-.55,-.25),length*rng.uniform(.65,.82),depth-1,width*.72,color,rng)
        branch(dr,end_x,end_y,angle+rng.uniform(.20,.53),length*rng.uniform(.62,.78),depth-1,width*.69,color,rng)

def scenery(im,kind):
    w,h=im.size; layer=Image.new('RGBA',(w,h),(0,0,0,0)); d=ImageDraw.Draw(layer,'RGBA'); rng=random.Random(19 if kind=='header' else 22)
    if kind=='header':
        # Shoals across right half, sparse so not competing with live text
        for i in range(90):
            x=int(w*(.36+rng.random()*.63)); y=int(h*(.21+rng.random()*.61)); s=rng.uniform(14,44) * (0.4+0.65*y/h)
            fish(layer,x,y,s,int(rng.uniform(72,115)),rng.choice([-1,1]))
        # distant shadow mass at bottom and side
        d.polygon([(0,h),(0,int(h*.70)),(int(w*.08),int(h*.81)),(int(w*.21),int(h*.92)),(int(w*.38),h)],fill=(0,16,31,45))
        d.polygon([(int(w*.78),h),(int(w*.87),int(h*.84)),(w,int(h*.72)),(w,h)],fill=(0,14,29,53))
        for i in range(27):
            x = int(w*rng.choice([rng.uniform(.01,.19),rng.uniform(.83,.99)]))
            y = h+rng.randint(0,50)
            length=rng.uniform(h*.10,h*.30)
            branch(d,x,y,-math.pi/2+rng.uniform(-.55,.55),length,3,rng.uniform(2,6),(3,36,53,int(rng.uniform(55,105))),rng)
    else:
        # light left side / edges, dark middle where labels reside
        for i in range(90):
            x=int(w*(.04+rng.random()*.93)); y=int(h*(.10+rng.random()*.86)); s=rng.uniform(10,28)
            fish(layer,x,y,s,int(rng.uniform(48,90)),rng.choice([-1,1]))
        d.polygon([(0,h),(0,int(h*.54)),(int(w*.09),int(h*.65)),(int(w*.3),h)],fill=(0,16,29,43))
        d.polygon([(w,h),(w,int(h*.71)),(int(w*.88),int(h*.78)),(int(w*.74),h)],fill=(0,16,29,43))
        for i in range(55):
            x=int(w*rng.choice([rng.uniform(.01,.12),rng.uniform(.83,.98)]));y=int(h*rng.uniform(.72,1.11))
            length=rng.uniform(h*.023,h*.085)
            branch(d,x,y,-math.pi/2+rng.uniform(-.52,.52),length,4,rng.uniform(2,5),(5,46,66,int(rng.uniform(38,78))),rng)
    # Reduce texture opacity globally and blend
    im=Image.alpha_composite(im,layer)
    return im

def create(w,h,kind):
    im=backdrop(w,h,kind)
    im=Image.alpha_composite(im,beam_layer(w,h,kind))
    im=scenery(im,kind)
    # full-pass dark overlay, gradient maintains clear text-safe area
    im=im.convert('RGB')
    return im

sizes={'header':(2560,640),'sidebar':(720,1600)}
for kind,(w,h) in sizes.items():
    im=create(w,h,kind)
    im.save(f'{out}/nmc-texture-{kind}.webp','WEBP',quality=82,method=6)
    im.save(f'{out}/nmc-texture-{kind}-preview.png',optimize=True)
    print(kind,w,h,os.path.getsize(f'{out}/nmc-texture-{kind}.webp'))

# provide conceptual placement view created from *our standalone texture assets*, not extracted mockups
hdr=Image.open(f'{out}/nmc-texture-header.webp').convert('RGB')
sid=Image.open(f'{out}/nmc-texture-sidebar.webp').convert('RGB')
canvas=Image.new('RGB',(1200,780),'#F0F6FA')
D=ImageDraw.Draw(canvas)
# header and sidebar only, no deceptive dummy text
canvas.paste(hdr.resize((1120,280),Image.Resampling.LANCZOS),(40,38))
canvas.paste(sid.resize((250,390),Image.Resampling.LANCZOS),(40,348))
# preview usage: navy windows on right using same images and overlays? show a few repeated crop placements
canvas.paste(hdr.resize((800,180),Image.Resampling.LANCZOS),(330,380))
canvas.paste(sid.resize((800,140),Image.Resampling.LANCZOS),(330,596))
canvas.save(f'{out}/texture-preview.png',optimize=True)
