import time
from playwright.sync_api import sync_playwright
B="http://localhost:3230/"
CTA="""()=>{const a=[...document.querySelectorAll('a')].find(x=>/Explore Our Products/.test(x.textContent));if(!a)return null;a.scrollIntoView({block:'center'});const r=a.getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);const ov=document.querySelector('[data-testid=intro-overlay]');return {hit:e===a||a.contains(e),overlay:!!ov,pe:ov?getComputedStyle(ov).pointerEvents:null}}"""
with sync_playwright() as p:
    br=p.chromium.launch()
    for w in (375,1440):
        ctx=br.new_context(viewport={"width":w,"height":800}); pg=ctx.new_page()
        errs=[]; pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None)
        t0=time.time(); pg.goto(B,wait_until="commit")
        pg.wait_for_selector("[data-testid=intro-overlay]",timeout=8000); tov=time.time()-t0
        print(w,"overlay appeared at",round(tov,2),"s after commit")
        h1=pg.evaluate("(document.querySelector('h1')||{}).textContent"); print(" h1",repr(h1))
        t1=time.time(); marks=[0.3,0.9,1.6,2.2,2.8]; i=0; clickable_at=None; gone=None; log=[]
        while time.time()-t1<5:
            el=time.time()-t1
            if i<len(marks) and el>=marks[i]:
                pg.screenshot(path=f"intro-{w}-{int(marks[i]*1000)}ms.png"); i+=1
            s=pg.evaluate(CTA); log.append((round(el,2),s))
            if s and s['hit'] and clickable_at is None: clickable_at=round(el,2)
            if s and not s['overlay'] and gone is None: gone=round(el,2)
            if gone and i>=len(marks): break
            pg.wait_for_timeout(60)
        first=log[0]; print(" first CTA probe",first," CTA hit-testable at (s since overlay visible)",clickable_at," overlay removed at",gone, "errs",errs)
        # reload same context
        pg.reload(); pg.wait_for_timeout(1500); print(" after reload overlay present:",pg.locator("[data-testid=intro-overlay]").count())
        ctx.close()
    # skip button + Escape + new ctx shows again
    for mode in ("skip","esc"):
        ctx=br.new_context(viewport={"width":375,"height":800}); pg=ctx.new_page(); pg.goto(B)
        pg.wait_for_selector("[data-testid=intro-overlay]"); pg.wait_for_timeout(500)
        t=time.time()
        if mode=="skip":
            sk=pg.locator("[data-testid=intro-skip]"); print("skip visible",sk.is_visible(), "label",sk.inner_text()); sk.click()
        else: pg.keyboard.press("Escape")
        pg.wait_for_selector("[data-testid=intro-overlay]",state="detached",timeout=3000); print(mode,"removed after",round(time.time()-t,2),"s")
        ctx.close()
    ctx=br.new_context(viewport={"width":375,"height":800},reduced_motion="reduce"); pg=ctx.new_page(); pg.goto(B); pg.wait_for_timeout(1500)
    print("reduced-motion overlay count",pg.locator("[data-testid=intro-overlay]").count()); 
    ctx.close()
    # auto complete time
    ctx=br.new_context(viewport={"width":1440,"height":800}); pg=ctx.new_page(); pg.goto(B); pg.wait_for_selector("[data-testid=intro-overlay]"); t=time.time()
    pg.wait_for_selector("[data-testid=intro-overlay]",state="detached",timeout=6000); print("auto removal after visible:",round(time.time()-t,2))
    br.close()
