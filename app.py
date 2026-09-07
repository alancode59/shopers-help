"""
Aplicación web para poner precios a fotos de productos.
"""

import os
import tempfile
import zipfile
from pathlib import Path
from uuid import uuid4

from flask import Flask, render_template, request, send_file, jsonify, url_for
from werkzeug.utils import secure_filename

from text_overlay import agregar_precio

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
PROCESADAS_FOLDER = BASE_DIR / "procesadas"
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}

UPLOAD_FOLDER.mkdir(exist_ok=True)
PROCESADAS_FOLDER.mkdir(exist_ok=True)

COMISION = 0.20
GANANCIA_Y_ENVIO = 0.50


def allowed_file(filename):
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def calcular_precio_final(precio_base):
    con_comision = precio_base * (1 + COMISION)
    return con_comision * (1 + GANANCIA_Y_ENVIO)


def nombre_seguro_unico(filename):
    return f"{uuid4().hex[:8]}_{secure_filename(filename)}"


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_files():
    if 'fotos' not in request.files:
        return jsonify({'error': 'No se recibieron archivos'}), 400

    files = request.files.getlist('fotos')
    precios_raw = request.form.getlist('precios')

    if not files or len(files) != len(precios_raw):
        return jsonify({'error': 'Cada foto necesita su propio precio'}), 400

    resultados = []
    errores = []

    for file, precio_raw in zip(files, precios_raw):
        try:
            precio_base = float(precio_raw)
        except ValueError:
            errores.append(f"{file.filename}: precio inválido")
            continue

        if precio_base <= 0:
            errores.append(f"{file.filename}: el precio debe ser mayor a 0")
            continue

        if not file or not allowed_file(file.filename):
            errores.append(f"{file.filename}: formato no permitido")
            continue

        precio_final = calcular_precio_final(precio_base)
        nombre_original = secure_filename(file.filename)
        nombre_salida = nombre_seguro_unico(file.filename)
        filepath = UPLOAD_FOLDER / nombre_salida
        output_path = PROCESADAS_FOLDER / nombre_salida

        try:
            file.save(filepath)
            agregar_precio(str(filepath), str(output_path), precio_final)
            resultados.append({
                'nombre': nombre_original,
                'precio': precio_final,
                'url': url_for('archivo_procesado', filename=nombre_salida)
            })
        except Exception as e:
            errores.append(f"{nombre_original}: {e}")
        finally:
            filepath.unlink(missing_ok=True)

    respuesta = {
        'mensaje': f'Procesadas {len(resultados)} de {len(files)} fotos',
        'fotos': resultados,
    }
    if errores:
        respuesta['errores'] = errores

    return jsonify(respuesta)


@app.route('/procesadas/<filename>')
def archivo_procesado(filename):
    ruta = PROCESADAS_FOLDER / secure_filename(filename)
    if not ruta.exists():
        return jsonify({'error': 'No encontrado'}), 404
    return send_file(ruta)


@app.route('/procesadas/<filename>', methods=['DELETE'])
def eliminar_foto(filename):
    ruta = PROCESADAS_FOLDER / secure_filename(filename)
    if not ruta.exists():
        return jsonify({'error': 'No encontrado'}), 404
    ruta.unlink()
    return jsonify({'ok': True})


@app.route('/limpiar-todo', methods=['POST'])
def limpiar_todo():
    eliminados = 0
    for archivo in PROCESADAS_FOLDER.glob('*'):
        archivo.unlink()
        eliminados += 1
    return jsonify({'ok': True, 'eliminados': eliminados})


@app.route('/descargar-todas')
def descargar_todas():
    archivos = list(PROCESADAS_FOLDER.glob('*'))
    if not archivos:
        return jsonify({'error': 'No hay fotos procesadas'}), 404

    with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp:
        zip_path = Path(tmp.name)

    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for archivo in archivos:
            zipf.write(archivo, arcname=archivo.name)

    return send_file(
        zip_path,
        as_attachment=True,
        download_name='fotos_con_precio.zip',
    )


@app.route('/health')
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=5000, debug=debug)
