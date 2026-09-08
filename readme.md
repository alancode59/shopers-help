# Precios para fotos de producto

App web para ponerle precio a las fotos que te mandan los shoppers antes de reenviarlas por WhatsApp. Subes el lote, le das precio base a cada foto, y descargas todo con el precio ya montado sobre la imagen.

```
Subir fotos → precio base por foto → Procesar → galería con precio + descarga
```

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (con WSL2 en Windows, que es el default).

No necesitas instalar Python, Flask, ni nada más en tu máquina — todo corre dentro del contenedor.

## Arranque rápido

```bash
docker-compose up --build
```

Abre [http://localhost:5000](http://localhost:5000).

## Cómo se calcula el precio

Cada foto lleva su propio precio base (lo que te cobran a ti). La fórmula, en `app.py`:

```
con_comision  = precio_base * 1.20   # 20% comisión de ellos
precio_final  = con_comision * 1.50  # 50% tu ganancia + envío
```

Ejemplo: base $600 → con comisión $720 → precio final **$1,080**.

Si los porcentajes cambian, ajusta `COMISION` y `GANANCIA_Y_ENVIO` al inicio de `app.py`.

## Uso

1. Arrastra o selecciona varias fotos en "Subir fotos" — cada una aparece con su propia miniatura y su propio campo de precio.
2. Escribe el precio base de cada foto. Si varias comparten precio, escríbelo una vez en el panel "Precio sugerido" (izquierda) y usa **"Aplicar a todas las fotos"**.
3. "Procesar" se habilita solo cuando todas las fotos tienen precio.
4. En la galería de resultados: descarga foto por foto, o **"Descargar todo (ZIP)"** para llevarte el lote completo. "Limpiar todo" borra los resultados del servidor y del navegador.

## Estructura del proyecto

```
precios_docker/
├── app.py                 # rutas Flask, fórmula de precio
├── text_overlay.py        # dibuja el precio sobre la imagen (Pillow)
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── templates/
│   └── index.html
├── static/
│   ├── css/style.css
│   ├── js/main.js
│   └── fonts/              # Poppins Bold/SemiBold, horneadas en la imagen
├── uploads/                 # temporal, se limpia tras procesar cada foto
└── procesadas/               # fotos con precio, listas para descargar
```

## Modo desarrollo (hot-reload)

El `docker-compose.yml` actual ya está configurado para desarrollo:

- Monta todo el proyecto como volumen (`.:/app`) — guardas un archivo y el contenedor lo ve al instante.
- Gunicorn corre con `--reload`: los cambios en `app.py`/`text_overlay.py` reinician el proceso solo.
- Cambios en `.html`/`.css`/`.js` no necesitan ni reinicio — solo recarga el navegador (Ctrl+Shift+R si el navegador está cacheando agresivo).


## Notas técnicas

- Las fuentes Poppins están incluidas en `static/fonts/` y se copian a la imagen en el build — no se descargan en tiempo de ejecución, así el contenedor no depende de tener internet para arrancar.
- Cada foto procesada se guarda con un nombre único (`uuid` + nombre original) para evitar colisiones entre lotes.
- `uploads/` y `procesadas/` están montados como volúmenes: aunque reconstruyas la imagen o bajes el contenedor, esas fotos no se pierden.