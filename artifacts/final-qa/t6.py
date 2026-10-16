from playwright.sync_api import sync_playwright
B="http://localhost:3230"
LCP="""()=>new Promise(res=>{let v=null,el='';new PerformanceObserver(l=>{for(const e of l.getEntries()){v=e.startTime;el=(e.element&&e.element.tagName+'.'+String(e.element.className).slice(0,30))||''}}).observe({type:'largest-contentful-paint',buffered:true});setTimeout(()=>res([v,el]),4500)})"""
def run(br,ctx,url,label):
    pg=ctx.new_page(); cdp=ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate",{"rate":4})
    js=[]; pg.on("response",lambda r: js.append((r.url.split('/')[-1],int(r.headers.get('content-length','0') or 0))) if r.url.endswith('.js') else None)
    pg.goto(url); r=pg.evaluate(LCP)
    intro=any(n.startswith('881.') for n,_ in js)
    print(label,url,"LCP",round(r[0]),"ms",r[1],"| js files",len(js),"js bytes(content-length)",sum(b for _,b in js),"intro chunk 881 loaded:",intro); pg.close()
with sync_playwright() as p:
    br=p.chromium.launch()
    for w in (375,):
        ctx=br.new_context(viewport={"width":w,"height":800})
        run(br,ctx,B+"/","first-visit (4xCPU)"); run(br,ctx,B+"/","repeat-visit same ctx")
        run(br,ctx,B+"/products","products after / (same ctx, session seen)")
        ctx.close()
        ctx=br.new_context(viewport={"width":w,"height":800}); run(br,ctx,B+"/products","products fresh ctx"); run(br,ctx,B+"/products?category=herbs","herbs"); ctx.close()
        for i in range(2):
            ctx=br.new_context(viewport={"width":w,"height":800}); run(br,ctx,B+"/",f"first-visit #{i+2}"); run(br,ctx,B+"/",f"repeat #{i+2}"); ctx.close()
