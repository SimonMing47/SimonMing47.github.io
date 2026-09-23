"""Browser tests: ATLAS_TEST_HTTP=1 uses localhost and verifies real persistence.
Without it, load an in-memory page and exercise the storage-denied fallback.
Requires Playwright and Chromium; neither is needed to use the static website.
"""
import asyncio,json,os,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'tests'/'screens';QA.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=None if os.environ.get('ATLAS_TEST_CHROMIUM')=='bundled' else '/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1600,'height':1050},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  server=None
  if os.environ.get('ATLAS_TEST_HTTP')=='1':
   server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
   threading.Thread(target=server.serve_forever,daemon=True).start()
   await page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='load')
  else:
   await page.set_content((ROOT/'dist'/'index.html').read_text(),wait_until='load')
  await page.wait_for_timeout(550)
  report={'pageErrors':errors,'renderer':await page.evaluate("window.__atlasRenderer.gl?'WebGL':'software fallback'"),'storageMode':await page.evaluate('__knowledge.store.snapshot().mode'),'resources':[], 'diagramIssues':[]}
  await page.screenshot(path=str(QA/'overview.png'),full_page=True)
  # Data/controller interactions for every resource; ensure current topic and location stay in sync.
  ids=await page.evaluate('RESOURCES.map(r=>r.id)')
  for ident in ids:
   result=await page.evaluate("id=>{__atlasSelect(id);return {id:current,title:document.getElementById('detail-title').textContent,domain:window.__atlasState.domain,body:document.getElementById('detail-content').textContent.length,save:!!document.querySelector('#resource-save [data-save]'),view:__atlasState.view};}",ident)
   assert result['id']==ident and result['body']>120 and result['save'],result
   report['resources'].append(ident)
  # New software descriptions contain one source block and all five key sections.
  details=await page.evaluate("()=>SOFTWARE_MODULES.map(m=>{__atlasSelect(m.id);return {id:m.id,sections:document.querySelectorAll('.knowledge-section').length,links:document.querySelectorAll('.evidence-links a').length};})")
  assert all(v['sections']==5 and v['links']>0 for v in details),details
  report['softwareSections']=sum(v['sections'] for v in details)
  # Every diagram string is loaded into the live DOM; measure title/subtitle bounds.
  dims=await page.evaluate("""()=>{const errors=[];for(const kind of Object.keys(AtlasTopology.titles)){const d=AtlasTopology.make(kind,'A3');const host=document.getElementById('wire-canvas');host.innerHTML=AtlasTopology.svg(d,'software');for(const g of host.querySelectorAll('.diagram-node')){const r=g.querySelector('rect');if(!r)continue;const box=r.getBBox();for(const t of g.querySelectorAll('text')){const b=t.getBBox();if(b.x<box.x-2||b.x+b.width>box.x+box.width+2||b.y<box.y-2||b.y+b.height>box.y+box.height+2)errors.push({kind,text:t.textContent,box:{x:box.x,y:box.y,w:box.width,h:box.height},textBox:{x:b.x,y:b.y,w:b.width,h:b.height}});}}}return errors;}""")
  report['diagramIssues']=dims
  assert not dims,dims
  # Hover card via real mouse and keyboard focus.
  await page.evaluate("__atlasSelect('kv-cache');__atlasExplorer.setMode('wire')")
  await page.wait_for_timeout(100)
  target=page.locator('.tree-select[data-resource="kv-cache"]');await target.scroll_into_view_if_needed();await target.hover();await page.wait_for_timeout(450)
  assert await page.locator('#knowledge-preview').is_visible()
  assert '键' in await page.locator('#knowledge-preview').inner_text() or 'KV' in await page.locator('#knowledge-preview').inner_text()
  await page.screenshot(path=str(QA/'hover.png'),full_page=True)
  await page.keyboard.press('Escape')
  # Bookmark module and section and fault. All values remain readonly to backend.
  await page.locator('#resource-save [data-save]').click()
  assert await page.evaluate('__knowledge.store.snapshot().count')==1
  await page.locator('#point-analogy [data-save]').click()
  assert await page.evaluate('__knowledge.store.snapshot().count')==2
  await page.locator('#open-library').click()
  assert await page.locator('#bookmark-dialog').is_visible()
  textarea=page.locator('#bookmark-items textarea').first
  note='KV理解：分块是存储管理。<img src=x onerror=alert(1)> 不是HTML。'
  await textarea.fill(note);await page.locator('[data-save-note]').first.click()
  assert note in await page.evaluate('__knowledge.store.snapshot().items.map(i=>i.note)')
  assert await page.locator('#bookmark-items img').count()==0
  await page.screenshot(path=str(QA/'bookmarks.png'),full_page=True)
  if server:
   before=await page.evaluate('__knowledge.store.snapshot().items')
   await page.reload(wait_until='load');await page.wait_for_timeout(250)
   after=await page.evaluate('__knowledge.store.snapshot().items')
   assert before==after,(before,after)
   assert await page.evaluate('__knowledge.store.snapshot().mode')=='persistent'
   await page.locator('#open-library').click()
  # Export backup; import merge without note loss.
  async with page.expect_download() as dl:
   await page.locator('#bookmark-export').click()
  downloaded=await dl.value;dest=QA/'bookmark-test-export.json';await downloaded.save_as(str(dest));exported=json.loads(dest.read_text());assert len(exported['items'])==2
  await page.locator('#bookmark-file').set_input_files(str(dest));await page.wait_for_timeout(80)
  assert await page.evaluate('__knowledge.store.snapshot().count')==2
  await page.locator('[data-bookmark-jump]').first.click();await page.wait_for_timeout(100)
  assert await page.evaluate('current')=='kv-cache'
  await page.evaluate("__atlasFault('B15');")
  await page.wait_for_timeout(100)
  faultsave=page.locator('#fault-B15 [data-save]');await faultsave.click();assert await page.evaluate('__knowledge.store.snapshot().count')==3
  await page.locator('#open-library').click();await page.locator('[data-remove-bookmark]').first.click();assert await page.evaluate('__knowledge.store.snapshot().count')==2
  await page.keyboard.press('Escape')
  report['bookmarks']={'module':'passed','section':'passed','fault':'passed','note':'passed','escapedHTML':'passed','exportImportMerge':'passed','jump':'passed','remove':'passed','persistentBrowserOrigin':'passed: real same-origin localStorage survives reload' if server else 'not available: administrator blocks navigation; Node adapter reload tested separately'}
  # A5 is known in software but not mapped to fabricated hardware.
  await page.evaluate("__atlasSelect('mindcluster',{profile:'A5'})")
  assert 'A5' in await page.locator('#detail-content').inner_text()
  await page.screenshot(path=str(QA/'mindcluster-a5.png'),full_page=True)
  await page.evaluate("__atlasSelect('prefill-decode');__atlasExplorer.setMode('wire')")
  await page.screenshot(path=str(QA/'inference-sequence.png'),full_page=True)
  # tab and locator click
  await page.locator('#detail-panel [data-tab="sources"]').click();assert await page.locator('.evidence-card').count()>0
  await page.evaluate("__atlasSelect('orchestration')")
  # Responsive layout: diagrams may intentionally scroll inside their own area, never the whole page.
  for width in [1280,1000,390]:
   await page.set_viewport_size({'width':width,'height':900});await page.evaluate("__atlasSelect('batching');__atlasExplorer.setMode('wire')");await page.wait_for_timeout(100)
   overflow=await page.evaluate('document.documentElement.scrollWidth>innerWidth+1');report[f'pageOverflow{width}']=overflow
   assert not overflow,(width,await page.evaluate('document.documentElement.scrollWidth'))
   if width==390:await page.screenshot(path=str(QA/'mobile.png'),full_page=True)
  assert not errors,errors
  (ROOT/'tests'/'browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
  print(json.dumps({**report,'resources':len(report['resources'])},ensure_ascii=False,indent=2))
  if server:server.shutdown()
  await browser.close()
asyncio.run(main())
