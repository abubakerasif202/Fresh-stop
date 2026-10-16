from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    br=p.chromium.launch(); ctx=br.new_context(viewport={"width":375,"height":800}); pg=ctx.new_page()
    pg.goto("http://localhost:3230/products"); pg.wait_for_timeout(2500)
    print(pg.evaluate("[...document.images].filter(i=>i.src.includes('apricots')).map(i=>[i.outerHTML.slice(0,400),i.parentElement.outerHTML.slice(0,200),i.closest('[class]').className.slice(0,80)])"))
