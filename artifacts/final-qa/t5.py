import json,re
from playwright.sync_api import sync_playwright
B="http://localhost:3230"; AX=open("../../node_modules/axe-core/axe.min.js",encoding="utf8").read()
R=["/","/products","/products?category=herbs","/products/apricots","/wholesale","/nonexistent-route"]
with sync_playwright() as p:
    br=p.chromium.launch()
    for w in (375,1440):
        ctx=br.new_context(viewport={"width":w,"height":900}); ctx.add_init_script("sessionStorage.setItem('fs-intro-seen','1')")
        for r in R:
            pg=ctx.new_page(); pg.goto(B+r); pg.wait_for_timeout(1200); pg.evaluate(AX)
            res=pg.evaluate("axe.run(document,{resultTypes:['violations']}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,sel:v.nodes.slice(0,3).map(n=>n.target.join(' ')),msg:v.nodes[0].failureSummary.slice(0,200)})))")
            print(w,r,"violations:",len(res))
            for v in res: print("   ",v['impact'],v['id'],v['n'],v['sel'],"|",v['msg'].replace("\n"," "))
            pg.close()
        ctx.close()
    # keyboard focus ring
    ctx=br.new_context(viewport={"width":1440,"height":900}); ctx.add_init_script("sessionStorage.setItem('fs-intro-seen','1')"); pg=ctx.new_page(); pg.goto(B+"/products?category=herbs"); pg.wait_for_timeout(1000)
    for i in range(16):
        pg.keyboard.press("Tab")
        s=pg.evaluate("""()=>{const e=document.activeElement,c=getComputedStyle(e);return {t:e.tagName+'.'+String(e.className).slice(0,25),txt:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,22),ol:c.outlineStyle+' '+c.outlineWidth+' '+c.outlineColor,bs:c.boxShadow.slice(0,40)}}""")
        vis = (s['ol'].startswith('none') or s['ol'].split()[1] in('0px',)) and (s['bs']=='none')
        print(i,s,"NO RING" if vis else "ring")
        if i in(2,9): pg.screenshot(path=f"focus-{i}.png")
    ctx.close()
    # reduced motion
    for rm in ("reduce","no-preference"):
        ctx=br.new_context(viewport={"width":1440,"height":900},reduced_motion=rm); ctx.add_init_script("sessionStorage.setItem('fs-intro-seen','1')"); pg=ctx.new_page()
        for r in ("/","/products"):
            pg.goto(B+r); pg.wait_for_timeout(1500)
            pg.evaluate("window.scrollTo(0,600)"); pg.wait_for_timeout(1000)
            o=pg.evaluate("""()=>{const out={inf:[],byclass:{}};for(const e of document.querySelectorAll('*')){const c=getComputedStyle(e);const n=c.animationName.split(',').map(s=>s.trim());const it=c.animationIterationCount.split(',');const du=c.animationDuration.split(',');n.forEach((nm,i)=>{if(nm!=='none'&&(it[i%it.length]==='infinite')&&parseFloat(du[i%du.length])>0.01)out.inf.push(e.tagName+'.'+String(e.className).slice(0,30)+':'+nm+' '+du[i%du.length])});}
            const sel={mascot:'[class*=mascot]',particle:'[class*=particle],[class*=float]',card:'.pc'};for(const[k,s]of Object.entries(sel)){const els=[...document.querySelectorAll(s)];out.byclass[k]=[els.length,[...new Set(els.map(e=>{const c=getComputedStyle(e);return c.animationName+'/'+c.animationDuration}))].slice(0,4)]}
            return out}""")
            print("RM",rm,r,"infinite running:",len(o['inf']),o['inf'][:6],o['byclass'])
        ctx.close()
    br.close()
