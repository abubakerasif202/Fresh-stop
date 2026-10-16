from playwright.sync_api import sync_playwright
B="http://localhost:3230/"
LCP="""()=>new Promise(res=>{let v=null;new PerformanceObserver(l=>{for(const e of l.getEntries())v=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});setTimeout(()=>res(v),4500)})"""
with sync_playwright() as p:
    br=p.chromium.launch()
    for i in range(3):
        ctx=br.new_context(viewport={"width":375,"height":800}); pg=ctx.new_page(); cdp=ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate",{"rate":4})
        js=[]; pg.on("response",lambda r: js.append(r.url.split('/')[-1]) if r.url.endswith('.js') else None)
        pg.goto(B); a=pg.evaluate(LCP); f=any(n.startswith('881.') for n in js)
        js.clear(); pg.reload(); b=pg.evaluate(LCP); r=any(n.startswith('881.') for n in js)
        print(f"run{i}: first LCP {round(a)}ms intro-chunk {f} | reload(repeat) LCP {round(b)}ms intro-chunk {r} overlay {pg.locator('[data-testid=intro-overlay]').count()}")
        ctx.close()
