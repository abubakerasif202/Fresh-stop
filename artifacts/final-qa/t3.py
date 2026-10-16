import re,json
from playwright.sync_api import sync_playwright
B="http://localhost:3230"
BAD=re.compile(r"order (placed|confirmed|received|accepted)|thank you for your order|payment",re.I)
with sync_playwright() as p:
    br=p.chromium.launch()
    ctx=br.new_context(viewport={"width":1440,"height":900}); ctx.add_init_script("sessionStorage.setItem('fs-intro-seen','1')")
    pg=ctx.new_page(); pg.goto(B+"/products"); pg.wait_for_timeout(800)
    btn=pg.get_by_role("button",name=re.compile("Enquire for Details")).first
    print("btn count",pg.get_by_role("button",name=re.compile("Enquire for Details")).count())
    name=pg.evaluate("document.querySelector('.enq-btn .sr-only').textContent")
    print("sr name:",name)
    btn.scroll_into_view_if_needed(); btn.click(); pg.wait_for_selector("dialog.enq-sheet[open]")
    pg.wait_for_timeout(1400)
    pg.screenshot(path="enquiry-sheet-1440.png")
    d=pg.evaluate("""()=>{const wa=document.querySelector('.enq-link-wa'),m=document.querySelector('.enq-link-mail');return {wa:wa.href,wt:wa.target,wr:wa.rel,m:m.href,h2:document.querySelector('dialog h2').textContent,focus:document.activeElement.className+'|'+document.activeElement.tagName}}""")
    print(d)
    pn=d['h2'].replace("Enquire about ","")
    from urllib.parse import quote,unquote
    print("wa prefix ok",d['wa'].startswith("https://wa.me/61423936586?text="),"name encoded",quote(pn) in d['wa'] or quote(pn,safe='') in d['wa'], "mail ok",d['m'].startswith("mailto:info@freshstop.com.au"),"name in mail",quote(pn) in d['m'])
    print("decoded wa text:",unquote(d['wa'].split('text=')[1]))
    print("decoded mail:",unquote(d['m']))
    # defaultPrevented
    pg.evaluate("window.__dp=[];document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a');if(a)setTimeout(()=>window.__dp.push([a.className,e.defaultPrevented]),0)},true);document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a');if(a)window.__dp.push(['bubble-end:'+a.className,e.defaultPrevented])})")
    # block popups navigation effects: listen popup
    with ctx.expect_page(timeout=5000) as pi:
        pg.locator(".enq-link-wa").click()
    pop=pi.value; print("wa popup url:",pop.url[:90]); pop.close()
    pg.wait_for_timeout(300)
    print("dp log",pg.evaluate("window.__dp"))
    print("status text:",pg.locator(".enq-status").inner_text())
    # mailto click -> will try to navigate; catch
    try:
        pg.locator(".enq-link-mail").click(timeout=3000)
    except Exception as e: print("mail click exc",str(e)[:100])
    pg.wait_for_timeout(500)
    print("dp log2",pg.evaluate("window.__dp"), "url still",pg.url)
    # text scan
    txt=pg.evaluate("document.documentElement.innerText+' '+document.documentElement.innerHTML")
    print("bad text matches (html):",set(m.group(0) for m in BAD.finditer(txt)))
    # keyboard flow
    pg.reload(); pg.wait_for_timeout(800)
    b=pg.get_by_role("button",name=re.compile("Enquire for Details")).first
    b.focus(); pg.keyboard.press("Enter"); pg.wait_for_selector("dialog.enq-sheet[open]"); pg.wait_for_timeout(300)
    seq=[]
    for _ in range(4):
        pg.keyboard.press("Tab"); seq.append(pg.evaluate("document.activeElement.className.toString().slice(0,30)+'|'+(document.activeElement.getAttribute('aria-label')||document.activeElement.textContent.trim().slice(0,15))"))
    print("tab seq in dialog",seq, "all inside dialog:",pg.evaluate("!!document.activeElement.closest('dialog')"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
    print("after Esc dialog open count",pg.locator("dialog[open]").count(),"focus returns to enq button:",pg.evaluate("document.activeElement.classList.contains('enq-btn')"), pg.evaluate("document.activeElement.textContent.slice(0,40)"))
    # same button 1st? check it's the same card
    b.press("Enter"); pg.wait_for_selector("dialog.enq-sheet[open]"); pg.locator(".enq-close").click(); pg.wait_for_timeout(300)
    print("close btn -> focus on enq btn:",pg.evaluate("document.activeElement.classList.contains('enq-btn')"))
    # product page enquiry
    pg.goto(B+"/products/apricots"); 
    # contact pages
    for r in ("/wholesale","/home-delivery"):
        pg.goto(B+r); hs=pg.evaluate("[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(h=>/^(tel:|mailto:|https:\/\/wa\.me)/.test(h))")
        print(r,sorted(set(hs)))
    # all pages bad text
    for r in ("/","/products","/products/apricots","/wholesale","/home-delivery","/stores","/nonexistent-route"):
        pg.goto(B+r); pg.wait_for_timeout(500)
        t=pg.evaluate("document.documentElement.innerText"); ms=set(m.group(0) for m in BAD.finditer(t)); 
        ui=re.findall(r"(?i)add to (cart|basket)|buy now|\$\s?\d+(\.\d\d)?|checkout",t)
        print("scan",r,ms,ui[:3])
    br.close()
