from flask import Blueprint, render_template

from youtube_summary_app.config import DONATION_URL


pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/")
def index():
    return render_template("index.html", donation_url=DONATION_URL)
