export async function onRequest() {
  return new Response('请从创作台生成完整桌宠包。', {status:410,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
}
