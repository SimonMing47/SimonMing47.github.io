"""Live profile/topology/bookmark regression; HTTP in CI, memory page locally."""
import asyncio, json, os, threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[1]
async def main():
    out = ROOT/'tests'/'screens'; out.mkdir(exist_ok=True)
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=None if os.environ.get('ATLAS_TEST_CHROMIUM')=='bundled' else '/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=await browser.new_page(viewport={'width':1680,'height':1100})
        errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
        server=None
        try:
            if os.environ.get('ATLAS_TEST_HTTP')=='1':
                server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
                threading.Thread(target=server.serve_forever,daemon=True).start()
                await page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='load')
            else: await page.set_content((ROOT/'dist'/'index.html').read_text(),wait_until='load')
            await page.wait_for_timeout(150)
            await page.evaluate("__atlasSelect('superpod');__atlasExplorer.setMode('wire')")
            cases=[]
            for key,kind in [('A3','net-a3'),('A5','net-axes'),('A5-850','net-850'),('950','net-axes')]:
                await page.locator(f'#profile-tabs [data-profile="{key}"]').click()
                await page.wait_for_timeout(80)
                v=await page.evaluate("({profile,kind:__atlasExplorer.diagram().kind,title:document.getElementById('scene-title').textContent})")
                assert v['profile']==key and v['kind']==kind,v
                assert not await page.locator('#profile-message').evaluate("e=>e.textContent.includes('未核实')")
                cases.append(v)
                await page.screenshot(path=str(out/f'network-{key}.png'),full_page=True)
            # Every product and diagram combination fits its SVG node rectangles.
            geometry=await page.evaluate("""()=>{const issues=[];for(const p of Object.keys(PROFILES)){for(const k of ['net-a3','net-axes','net-850','net-levels']){const d=AtlasTopology.make(k,p),host=document.getElementById('wire-canvas');host.innerHTML=AtlasTopology.svg(d,'hccs');for(const n of host.querySelectorAll('.diagram-node')){const rect=n.querySelector('rect').getBBox();for(const t of n.querySelectorAll('text')){const b=t.getBBox();if(b.x<rect.x-2||b.x+b.width>rect.x+rect.width+2||b.y<rect.y-2||b.y+b.height>rect.y+rect.height+2)issues.push({p,k,text:t.textContent});}}}}return issues;}""")
            assert not geometry,geometry
            await page.evaluate("__atlasSelect('superpod',{profile:'A5-850'});__atlasExplorer.setMode('wire')")
            target=page.locator('#wire-canvas [data-go="server"]').first
            await target.hover(); await page.wait_for_timeout(400)
            assert await page.locator('#knowledge-preview').is_visible()
            await page.keyboard.press('Escape')
            # New product is accepted by the same local-only bookmark store.
            await page.locator('.network-evidence #point-mechanism [data-save]').click()
            before=await page.evaluate('__knowledge.store.snapshot().items')
            assert len(before)==1 and before[0]['profile']=='A5-850' and before[0]['section']=='mechanism',before
            if server:
                await page.reload(wait_until='load');await page.wait_for_timeout(100)
                assert await page.evaluate('__knowledge.store.snapshot().items')==before
            await page.locator('#open-library').click()
            await page.locator('[data-bookmark-jump]').first.click()
            assert await page.evaluate('profile')=='A5-850'
            assert await page.locator('.network-evidence #point-mechanism').count()==1
            await page.locator('.network-evidence [data-topology="net-levels"]').click()
            assert await page.locator('#wire-title').inner_text()=='A5：Rank层级与路径分支'
            await page.screenshot(path=str(out/'network-rank-levels.png'),full_page=True)
            # Small screens scroll only the diagram, not the whole page.
            sizes={}
            for width in [1680,1280,1000,390]:
                await page.set_viewport_size({'width':width,'height':1000})
                await page.wait_for_timeout(80)
                overflow=await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
                assert not overflow,width
                sizes[str(width)]='no page overflow'
            assert not errors,errors
            result={'errors':errors,'productSwitches':cases,'nodeTextIssues':geometry,'bookmarkNewProfile':'passed','bookmarkAfterReload':'passed on HTTP origin' if server else 'not asserted on memory page','responsive':sizes,'renderer':await page.evaluate("__atlasRenderer.gl?'WebGL':'software fallback'")}
            (ROOT/'tests'/'network-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
            print(json.dumps(result,ensure_ascii=False,indent=2))
        finally:
            if server:server.shutdown();server.server_close()
            await browser.close()
asyncio.run(main())
