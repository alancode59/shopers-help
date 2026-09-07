
from functools import lru_cache
from pathlib import Path
from typing import Literal

from PIL import Image, ImageDraw, ImageFont, ImageOps

FUENTE_DIR = Path(__file__).resolve().parent / "static" / "fonts"
RUTA_FUENTE_PRECIO = FUENTE_DIR / "Poppins-Bold.ttf"
RUTA_FUENTE_MONEDA = FUENTE_DIR / "Poppins-SemiBold.ttf"

if not RUTA_FUENTE_PRECIO.exists() or not RUTA_FUENTE_MONEDA.exists():
    raise FileNotFoundError(
        f"Faltan las fuentes en {FUENTE_DIR}. "
        "Copia Poppins-Bold.ttf y Poppins-SemiBold.ttf ahí "
        "(y asegúrate de que el Dockerfile las incluya en el build)."
    )

Posicion = Literal["bottom-right", "bottom-left", "bottom-center"]


@lru_cache(maxsize=64)
def _cargar_fuente(ruta: str, tamano: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(ruta, tamano)


def _formatear_precio(precio: float, moneda: str = "MXN") -> tuple[str, str]:
    numero = f"${precio:,.0f}" if precio == int(precio) else f"${precio:,.2f}"
    return numero, moneda


def _calcular_caja(
    numero_txt: str,
    moneda_txt: str,
    fuente_precio: ImageFont.FreeTypeFont,
    fuente_moneda: ImageFont.FreeTypeFont,
    padding_x: int,
    padding_y: int,
) -> dict:
    ancho_num = fuente_precio.getlength(numero_txt)
    ancho_mon = fuente_moneda.getlength(moneda_txt)
    espacio_entre = int(fuente_precio.size * 0.18)

    ascent_p, descent_p = fuente_precio.getmetrics()
    ascent_m, descent_m = fuente_moneda.getmetrics()
    ascent_max = max(ascent_p, ascent_m)
    descent_max = max(descent_p, descent_m)
    alto_linea = ascent_max + descent_max

    return {
        "ancho_num": ancho_num,
        "ancho_mon": ancho_mon,
        "espacio_entre": espacio_entre,
        "ascent_max": ascent_max,
        "caja_ancho": ancho_num + espacio_entre + ancho_mon + padding_x * 2,
        "caja_alto": alto_linea + padding_y * 2,
    }


def _posicion_caja(
    posicion: Posicion, ancho_img: int, alto_img: int,
    caja_ancho: int, caja_alto: int, margen: int,
) -> tuple[int, int]:
    if posicion == "bottom-left":
        x0 = margen
    elif posicion == "bottom-center":
        x0 = (ancho_img - caja_ancho) // 2
    else:
        x0 = ancho_img - caja_ancho - margen
    y0 = alto_img - caja_alto - margen
    return x0, y0


def agregar_precio(
    ruta_entrada: str,
    ruta_salida: str,
    precio: float,
    moneda: str = "MXN",
    posicion: Posicion = "bottom-right",
) -> str:

    if precio <= 0:
        raise ValueError("El precio debe ser mayor a 0")

    img = Image.open(ruta_entrada)
    img = ImageOps.exif_transpose(img).convert("RGBA")
    ancho, alto = img.size

    tam_fuente_precio = max(28, int(ancho * 0.075))
    tam_fuente_moneda = max(16, int(ancho * 0.032))
    margen = int(ancho * 0.04)
    padding_x = int(tam_fuente_precio * 0.55)
    padding_y = int(tam_fuente_precio * 0.35)
    radio = int(tam_fuente_precio * 0.35)

    fuente_precio = _cargar_fuente(str(RUTA_FUENTE_PRECIO), tam_fuente_precio)
    fuente_moneda = _cargar_fuente(str(RUTA_FUENTE_MONEDA), tam_fuente_moneda)
    numero_txt, moneda_txt = _formatear_precio(precio, moneda)

    medidas = _calcular_caja(
        numero_txt, moneda_txt, fuente_precio, fuente_moneda, padding_x, padding_y
    )
    x0, y0 = _posicion_caja(
        posicion, ancho, alto, medidas["caja_ancho"], medidas["caja_alto"], margen
    )

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle(
        [x0, y0, x0 + medidas["caja_ancho"], y0 + medidas["caja_alto"]],
        radius=radio,
        fill=(15, 15, 15, 190),
    )

    baseline_y = y0 + padding_y + medidas["ascent_max"]
    tx = x0 + padding_x
    draw.text((tx, baseline_y), numero_txt, font=fuente_precio,
              fill=(255, 255, 255, 255), anchor="ls")

    tx_mon = tx + medidas["ancho_num"] + medidas["espacio_entre"]
    draw.text((tx_mon, baseline_y), moneda_txt, font=fuente_moneda,
              fill=(230, 230, 230, 255), anchor="ls")

    resultado = Image.alpha_composite(img, overlay).convert("RGB")

    ruta_salida_path = Path(ruta_salida)
    ruta_salida_path.parent.mkdir(parents=True, exist_ok=True)

    formato = ruta_salida_path.suffix.lower()
    if formato in (".jpg", ".jpeg"):
        resultado.save(ruta_salida_path, quality=92, optimize=True)
    else:
        resultado.save(ruta_salida_path, optimize=True)

    return str(ruta_salida_path)
