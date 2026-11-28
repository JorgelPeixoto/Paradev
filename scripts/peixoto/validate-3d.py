#!/usr/bin/env python3
"""Validação local de malha; não envia nem inicia impressões."""
import argparse
import json
from pathlib import Path


def validate(path, single_piece=False, bed=220):
    import numpy as np
    import trimesh
    mesh = trimesh.load(path, force="mesh")
    if not len(mesh.faces) or not np.isfinite(mesh.vertices).all():
        raise ValueError("Malha vazia ou com coordenadas inválidas")
    parts = mesh.split(only_watertight=False)
    bounds = mesh.bounds
    errors = []
    if not mesh.is_watertight:
        errors.append("A malha não está fechada")
    if single_piece and len(parts) != 1:
        errors.append(f"Esperada peça única; encontrados {len(parts)} componentes separados")
    if np.any(bounds[0] < -0.05) or np.any(bounds[1, :2] > bed + 0.05) or bounds[1, 2] > 220.05:
        errors.append("A peça posicionada ultrapassa a área de impressão da AD5X")
    if bounds[0, 2] > 0.05:
        errors.append("A peça não está apoiada em Z=0")
    down = mesh.face_normals[:, 2] < -0.9
    centers = mesh.triangles_center[:, 2]
    report = {
        "arquivo": str(Path(path).resolve()),
        "unidade_assumida": "mm; confirme as medidas solicitadas",
        "dimensoes_mm": mesh.extents.round(3).tolist(),
        "limites_mm": bounds.round(3).tolist(),
        "componentes": len(parts),
        "malha_fechada": bool(mesh.is_watertight),
        "area_plana_na_mesa_mm2": round(float(mesh.area_faces[down & (centers < 0.05)].sum()), 2),
        "area_horizontal_suspensa_mm2": round(float(mesh.area_faces[down & (centers > 0.5)].sum()), 2),
        "erros": errors,
        "observacao": "Geometria verificada; ainda exige conferir prévia, perfil, bico, material e G-code. Não comprova resistência mecânica.",
    }
    return mesh, report


def preview(mesh, output):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection
    fig = plt.figure(figsize=(12, 4))
    triangles = mesh.triangles[::max(1, len(mesh.faces) // 12000)]
    for index, (elev, azim, name) in enumerate([(90, -90, "Vista superior"), (0, -90, "Vista frontal"), (25, -55, "Perspectiva")], 1):
        ax = fig.add_subplot(1, 3, index, projection="3d")
        ax.add_collection3d(Poly3DCollection(triangles, facecolor="#009bda", edgecolor="#333333", linewidth=0.1))
        ax.auto_scale_xyz(*mesh.vertices.T)
        ax.set_box_aspect(mesh.extents.clip(0.1))
        ax.view_init(elev=elev, azim=azim)
        ax.set_title(name)
        ax.set_xlabel("X (mm)"); ax.set_ylabel("Y (mm)"); ax.set_zlabel("Z (mm)")
    fig.tight_layout()
    fig.savefig(output, dpi=150)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("arquivo")
    parser.add_argument("--peca-unica", action="store_true")
    parser.add_argument("--previa", help="Caminho PNG da prévia geométrica")
    args = parser.parse_args()
    try:
        mesh, report = validate(args.arquivo, args.peca_unica)
        if args.previa:
            preview(mesh, args.previa)
            report["previa"] = str(Path(args.previa).resolve())
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1 if report["erros"] else 0
    except Exception as error:
        print(json.dumps({"erro": str(error)}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
