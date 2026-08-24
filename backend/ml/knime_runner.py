"""
KNIME batch-mode runner + output-CSV loader for the /upload/dataset pipeline.

This module triggers a pre-built KNIME workflow (built manually in the KNIME
Analytics Platform GUI — not something this codebase can author) and then reads
back whatever it wrote to KNIME_OUTPUT_FOLDER.

Expected KNIME workflow contract — the workflow at KNIME_WORKSPACE must, on
completion, write these files into KNIME_OUTPUT_FOLDER:

  etl_summary.csv          columns: rows_inserted
  clusters_output.csv      columns: patient_id, cluster_label, cluster_name,
                                     total_spent, visit_count, avg_stay
  decision_tree_output.csv columns: patient_id, predicted_class, confidence,
                                     actual_class
  association_rules_output.csv
                            columns: antecedent, consequent, support,
                                     confidence, lift
  model_metrics.csv        columns: model_name, accuracy, silhouette,
                                     num_rules, rows_trained, notes
                                     (one row per model: decision_tree, kmeans,
                                     association_rules — leave accuracy/
                                     silhouette blank where not applicable)

None of this can be exercised until KNIME is installed and that workflow
exists, so every step below fails loudly and specifically rather than
silently producing fake data.
"""
import os
import subprocess

import pandas as pd

from core.config import settings


class KnimeRunError(Exception):
    """Raised when any stage of the KNIME batch run fails."""

    def __init__(self, message: str, step: str):
        super().__init__(message)
        self.step = step


def save_upload_csv(df: pd.DataFrame) -> str:
    """Write the validated upload to KNIME's input folder as uploaded_dataset.csv."""
    try:
        os.makedirs(settings.KNIME_INPUT_FOLDER, exist_ok=True)
        path = os.path.join(settings.KNIME_INPUT_FOLDER, "uploaded_dataset.csv")
        df.to_csv(path, index=False)
        return path
    except Exception as exc:
        raise KnimeRunError(f"Could not save CSV to KNIME input folder: {exc}", step="save_csv")


def run_knime_workflow() -> str:
    """
    Trigger the KNIME workflow in batch mode and block until it exits.
    Returns combined stdout/stderr for logging. Raises KnimeRunError on any failure.
    """
    if not os.path.isfile(settings.KNIME_EXECUTABLE):
        raise KnimeRunError(
            f"KNIME executable not found at '{settings.KNIME_EXECUTABLE}'. "
            "Install KNIME Analytics Platform and set KNIME_EXECUTABLE in backend/.env.",
            step="launch_knime",
        )
    if not os.path.isdir(settings.KNIME_WORKSPACE):
        raise KnimeRunError(
            f"KNIME workflow directory not found at '{settings.KNIME_WORKSPACE}'. "
            "Build the adaptive-bi-pipeline workflow in the KNIME GUI first.",
            step="launch_knime",
        )

    try:
        result = subprocess.run(
            [
                settings.KNIME_EXECUTABLE,
                "-nosplash",
                "-noupdate",
                "--launcher.suppressErrors",
                "-application", "org.knime.product.KNIME_BATCH_APPLICATION",
                "-workflowDir", settings.KNIME_WORKSPACE,
                "-reset",
            ],
            capture_output=True,
            text=True,
            timeout=settings.KNIME_TIMEOUT_SECONDS,
        )
    except FileNotFoundError as exc:
        raise KnimeRunError(f"Failed to launch KNIME: {exc}", step="launch_knime")
    except subprocess.TimeoutExpired:
        raise KnimeRunError(
            f"KNIME workflow did not finish within {settings.KNIME_TIMEOUT_SECONDS} seconds.",
            step="knime_timeout",
        )

    if result.returncode != 0:
        raise KnimeRunError(
            f"KNIME workflow exited with code {result.returncode}: {result.stderr[-2000:]}",
            step="knime_failed",
        )

    return f"{result.stdout}\n{result.stderr}"


def _read_output_csv(filename: str, required_columns: list[str]) -> pd.DataFrame:
    path = os.path.join(settings.KNIME_OUTPUT_FOLDER, filename)
    if not os.path.isfile(path):
        raise KnimeRunError(
            f"Expected KNIME output file not found: {path}", step="read_outputs"
        )
    df = pd.read_csv(path)
    missing = [c for c in required_columns if c not in df.columns]
    if missing:
        raise KnimeRunError(
            f"'{filename}' is missing required columns: {missing}", step="read_outputs"
        )
    return df


def load_knime_outputs() -> dict:
    """Read every expected KNIME output CSV. Raises KnimeRunError if any is missing/malformed."""
    etl_summary = _read_output_csv("etl_summary.csv", ["rows_inserted"])
    clusters = _read_output_csv(
        "clusters_output.csv",
        ["patient_id", "cluster_label", "cluster_name", "total_spent", "visit_count", "avg_stay"],
    )
    decision_tree = _read_output_csv(
        "decision_tree_output.csv", ["patient_id", "predicted_class", "confidence", "actual_class"]
    )
    association_rules = _read_output_csv(
        "association_rules_output.csv", ["antecedent", "consequent", "support", "confidence", "lift"]
    )
    model_metrics = _read_output_csv(
        "model_metrics.csv", ["model_name", "accuracy", "silhouette", "num_rules", "rows_trained", "notes"]
    )

    return {
        "rows_inserted": int(etl_summary["rows_inserted"].iloc[0]) if len(etl_summary) else 0,
        "clusters": clusters,
        "decision_tree": decision_tree,
        "association_rules": association_rules.sort_values("lift", ascending=False).head(15),
        "model_metrics": model_metrics,
    }
