import re
from playwright.sync_api import sync_playwright
B="http://localhost:3230"
with sync_playwright() as p:
    br=p.chromium.launch()
    for rm in ("no-preference","reduce"):
      ctx=br.new_context(viewport={"width":1440,"height":900},reduced_motion=rm); ctx.add_init_script("sessionStorage.setItem('fs-intro-seen','1')")
      pg=ctx.new_page(); pg.goto(B+"/products"); pg.wait_for_timeout(800)
      for how in ("close","backdrop","esc"):
        b=pg.get_by_role("button",name=re.compile("Enquire for Details")).nth(2)
        b.click(); pg.wait_for_selector("dialog.enq-sheet[open]"); pg.wait_for_timeout(400)
        if how=="close": pg.locator(".enq-close").click()
        elif how=="backdrop": pg.mouse.click(5,5)
        else: pg.keyboard.press("Escape")
        pg.wait_for_timeout(400)
        print(rm,how,"open:",pg.locator("dialog[open]").count(),"active:",pg.evaluate("document.activeElement.tagName+'.'+document.activeElement.className.toString().slice(0,20)"))
    pg=br.new_context(viewport={"width":1440,"height":900}).new_page(); pg.goto(B+"/wholesale")
    print(pg.evaluate("[...document.querySelectorAll('a[href^=\"https://wa.me\"]')].map(a=>a.textContent.trim()+' <- '+(a.closest('section')||a.parentElement).querySelector('h1,h2')?.textContent)"))
