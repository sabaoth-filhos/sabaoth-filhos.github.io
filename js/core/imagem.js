// Fotos (perfil, carteirinha, árvore): redimensiona e comprime NO NAVEGADOR
// e devolve uma data URL pequena para salvar no documento do membro (sem Firebase Storage).
export const FOTO_LADO = 256;
export const FOTO_MAX_BYTES = 40 * 1024; // alvo ~40 KB
export const FOTO_MAX_CHARS = 60000;     // limite validado também nas regras do Firestore

function carregar(arquivo) {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error("Imagem inválida")); };
    img.src = url;
  });
}

/** Recorta no centro (quadrado), reduz para 256x256 e comprime (WebP, ou JPEG se o navegador não suportar). */
export async function comprimirFoto(arquivo, lado = FOTO_LADO) {
  if (!arquivo || !arquivo.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  const img = await carregar(arquivo);
  const c = document.createElement("canvas");
  c.width = c.height = lado;
  const ctx = c.getContext("2d");
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, lado, lado);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, lado, lado);
  const suportaWebp = c.toDataURL("image/webp").startsWith("data:image/webp");
  const tipo = suportaWebp ? "image/webp" : "image/jpeg";
  let q = 0.86, url = c.toDataURL(tipo, q);
  while (url.length * 0.75 > FOTO_MAX_BYTES && q > 0.35) { q -= 0.08; url = c.toDataURL(tipo, q); }
  if (url.length > FOTO_MAX_CHARS) { // último recurso: reduz o tamanho
    const c2 = document.createElement("canvas"); c2.width = c2.height = 192;
    c2.getContext("2d").drawImage(c, 0, 0, 192, 192); url = c2.toDataURL(tipo, 0.6);
  }
  return url;
}
