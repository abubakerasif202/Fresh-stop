from playwright.sync_api import sync_playwright
B="http://localhost:3230"; AX=open("../../node_modules/axe-core/axe.min.js",encoding="utf8").read()
Q="axe.run(document,{runOnly:['color-contrast','landmark-unique']}).then(r=>r.violations.map(v=>({id:v.id,n:v.nodes.length,d:v.nodes.slice(0,3).map(n=>n.target.join(' ').slice(-70)+' :: '+(n.any[0]?n.any[0].message.slice(0,110):''))})))"
with sync_playwright() as p:
    br=p.chromium.launch()
    for mode,rm in (("reduced-motion","reduce"),("motion+scrolled","no-preference")):
      for w in (375,1440):
        ctx=br.new_context(viewport={"width":w,"height":900},reduced_motion=rm); ctx.add_init_script("sessionStorage.setItem('fs-intro-seen','1')")
        for r in ("/products","/products?category=herbs","/wholesale","/products/apricots","/"):
            pg=ctx.new_page(); pg.goto(B+r); pg.wait_for_timeout(1200)
            if rm!="reduce":
                for y in range(0,3000,300): pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(150)
                pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(2500)
            pg.evaluate(AX); res=pg.evaluate(Q); print(mode,w,r,res); pg.close()
        ctx.close()
