import re,json,urllib.request,html
B="http://localhost:3230"
def get(u):
    return urllib.request.urlopen(B+u).read().decode()
sm=get("/sitemap.xml"); locs=re.findall(r"<loc>(.*?)</loc>",sm)
print("sitemap urls",len(locs)); print([l for l in locs if "category" in l or "checkout" in l or "admin" in l or "order" in l])
print("non-product:",[l for l in locs if "/products/" not in l])
print("robots:",get("/robots.txt"))
pg=get("/products"); cats=sorted(set(re.findall(r'href="/products\?category=([a-z0-9-]+)"',pg))); print("categories",cats)
seen={}
for u in ["/","/products"]+[f"/products?category={c}" for c in cats]+["/products/apricots","/wholesale","/home-delivery","/stores"]:
    h=get(u)
    t=re.search(r"<title>(.*?)</title>",h); d=re.search(r'<meta name="description" content="(.*?)"',h); c=re.search(r'<link rel="canonical" href="(.*?)"',h); rb=re.search(r'<meta name="robots" content="(.*?)"',h)
    ld=re.findall(r'<script type="application/ld\+json">(.*?)</script>',h,re.S)
    ok=[];off=False
    for j in ld:
        try: o=json.loads(html.unescape(j)) if False else json.loads(j); ok.append(True); off|=bool(re.search(r'"offers"|"price"',j))
        except Exception as e: ok.append(str(e)[:40])
    print(u,"|",t and t.group(1),"|",(d and d.group(1) or "")[:70],"|",c and c.group(1),"|",rb and rb.group(1),"| ld",ok,"offers/price:",off)
    seen.setdefault(("t",t and t.group(1)),[]).append(u); seen.setdefault(("d",d and d.group(1)),[]).append(u); seen.setdefault(("c",c and c.group(1)),[]).append(u)
print("DUPLICATES:",{k:v for k,v in seen.items() if len(v)>1})
