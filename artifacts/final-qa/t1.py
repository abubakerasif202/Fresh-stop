import json, sys
from playwright.sync_api import sync_playwright
B="http://localhost:3230"
VPS=[320,375,430,768,1024,1440,1920]
ROUTES=["/","/products","/products?category=herbs","/products?q=zzzz","/products/apricots","/wholesale","/home-delivery","/stores","/nonexistent-route"]
res=[]
with sync_playwright() as p:
    br=p.chromium.launch()
    for w in VPS:
        ctx=br.new_context(viewport={"width":w,"height":800})
        ctx.add_init_script("try{sessionStorage.setItem('fs-intro-seen','1')}catch(e){}")
        for r in ROUTES:
            pg=ctx.new_page(); errs=[]; fails=[]
            pg.on("console",lambda m,errs=errs,r=r:errs.append(m.text[:160]) if m.type=="error" and not (r=="/nonexistent-route" and "404" in m.text) else None)
            pg.on("pageerror",lambda e,errs=errs:errs.append("pageerror:"+str(e)[:160]))
            pg.on("requestfailed",lambda q,fails=fails:(fails.append("FAILED "+q.url[-80:]+" "+str(q.failure)) if "_rsc=" not in q.url else None))
            def onresp(rs,fails=fails,r=r):
                if rs.status>=400 and not (r=="/nonexistent-route" and rs.url.endswith(r)): fails.append(f"{rs.status} {rs.url[-80:]}")
            pg.on("response",onresp)
            pg.goto(B+r,wait_until="load")
            pg.wait_for_timeout(600)
            H=pg.evaluate("document.documentElement.scrollHeight")
            y=0
            while y<H:
                pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(120); y+=500
                H=pg.evaluate("document.documentElement.scrollHeight")
            pg.wait_for_timeout(800)
            # force eager
            pg.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')")
            pg.wait_for_timeout(800)
            m=pg.evaluate("""()=>{const d=document.documentElement;
              const imgs=[...document.images];
              const broken=imgs.filter(i=>!(i.complete&&i.naturalWidth>0)).map(i=>i.currentSrc||i.src);
              let wide=[];if(d.scrollWidth>d.clientWidth){wide=[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>d.clientWidth+1).slice(0,3).map(e=>e.tagName+'.'+String(e.className).slice(0,50))}
              return {sw:d.scrollWidth,cw:d.clientWidth,n:imgs.length,broken,wide,h1:(document.querySelector('h1')||{}).textContent}}""")
            row=dict(w=w,route=r,**m,errs=errs,fails=fails)
            res.append(row)
            ok = m['sw']<=m['cw'] and not errs and not fails and not m['broken']
            print(("PASS" if ok else "FAIL"),w,r,m["sw"],m["cw"],"imgs",m["n"],"broken",m["broken"],errs[:2],fails[:2],m['wide'],flush=True)
            if r in("/","/products"):
                pg.evaluate("window.scrollTo(0,0)");pg.wait_for_timeout(300)
                pg.screenshot(path=f"{'home' if r=='/' else 'products'}-{w}.png",full_page=True)
            pg.close()
        ctx.close()
    br.close()
json.dump(res,open("t1.json","w"),indent=1)
