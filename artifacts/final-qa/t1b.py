from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    br=p.chromium.launch(); ctx=br.new_context(viewport={"width":375,"height":800}); pg=ctx.new_page()
    pg.on("response",lambda r: print(r.status,r.url[-70:]) if "apricots" in r.url else None)
    pg.on("requestfailed",lambda r: print("FAIL",r.url[-70:],r.failure) if "apricots" in r.url else None)
    pg.goto("http://localhost:3230/products"); pg.wait_for_timeout(3000)
    print(pg.evaluate("[...document.images].filter(i=>i.src.includes('apricots')).map(i=>[i.complete,i.naturalWidth,i.loading,i.currentSrc.slice(-60),i.getAttribute('fetchpriority'),i.getBoundingClientRect().top])"))
    print(pg.evaluate("[...document.images].slice(0,3).map(i=>[i.alt,i.loading,i.complete,i.naturalWidth])"))
    pg.evaluate("window.scrollTo(0,0)");pg.wait_for_timeout(1500)
    print(pg.evaluate("[...document.images].filter(i=>i.src.includes('apricots')).map(i=>[i.complete,i.naturalWidth])"))
