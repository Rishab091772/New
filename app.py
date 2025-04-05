from flask import Flask, render_template, request, jsonify
from urllib.parse import quote as url_quote
import os, threading, time, random, requests, uuid
from datetime import datetime

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

status_data = {}
task_threads = {}
stop_flags = {}

def read_file_lines(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return [line.strip() for line in f.readlines() if line.strip()]

def get_profile_name(token):
    try:
        res = requests.get(f"https://graph.facebook.com/me?access_token={token}")
        return res.json().get("name", "Unknown")
    except:
        return "Unknown"

def validate_token(token):
    return get_profile_name(token) != "Unknown"

def comment_worker(task_id, token_path, comment_path, post_ids, first_name, last_name, delay):
    stop_flag = stop_flags[task_id]
    status_data[task_id] = {
        "summary": {"success": 0, "failed": 0},
        "latest": {
            "comment_number": None,
            "comment": None,
            "full_comment": None,
            "token": None,
            "post_id": None,
            "profile_name": None,
            "timestamp": None,
            "status": None
        }
    }

    tokens = read_file_lines(token_path)
    comments = read_file_lines(comment_path)
    post_ids = [x.strip() for x in post_ids.split(",") if x.strip()]
    valid_tokens = [t for t in tokens if validate_token(t)]

    if not valid_tokens or not comments or not post_ids:
        return

    comment_num = 0
    while not stop_flag.is_set():
        token = valid_tokens[comment_num % len(valid_tokens)]
        comment = comments[comment_num % len(comments)]
        post_id = post_ids[comment_num % len(post_ids)]
        profile_name = get_profile_name(token)
        full_comment = " ".join(filter(None, [first_name, comment, last_name]))
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        token_index = comment_num % len(valid_tokens)

        try:
            res = requests.post(f"https://graph.facebook.com/{post_id}/comments", data={
                "message": full_comment,
                "access_token": token
            })
            result = res.json()
            if "id" in result:
                status_data[task_id]["summary"]["success"] += 1
                status = "Success"
            else:
                status_data[task_id]["summary"]["failed"] += 1
                status = "Failed"
        except:
            status_data[task_id]["summary"]["failed"] += 1
            status = "Failed"

        status_data[task_id]["latest"] = {
            "comment_number": comment_num + 1,
            "comment": comment,
            "full_comment": full_comment,
            "token": f"Token #{token_index + 1}",
            "post_id": post_id,
            "profile_name": profile_name,
            "timestamp": timestamp,
            "status": status
        }

        comment_num += 1
        time.sleep(random.randint(delay, delay + 5))

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        token_file = request.files['token_file']
        comment_file = request.files['comment_file']
        post_ids = request.form.get('post_ids')
        first_name = request.form.get('first_name', '')
        last_name = request.form.get('last_name', '')
        delay = max(60, int(request.form.get('delay', 60)))

        token_path = os.path.join(UPLOAD_FOLDER, 'tokens.txt')
        comment_path = os.path.join(UPLOAD_FOLDER, 'comments.txt')
        token_file.save(token_path)
        comment_file.save(comment_path)

        task_id = str(uuid.uuid4())
        stop_flags[task_id] = threading.Event()

        t = threading.Thread(
            target=comment_worker,
            args=(task_id, token_path, comment_path, post_ids, first_name, last_name, delay),
            daemon=True
        )
        t.start()
        task_threads[task_id] = t

        if not task_id:
    return jsonify({"message": "Task ID is required."}), 400

    return render_template('index.html')

@app.route('/stop', methods=['POST'])
def stop():
    data = request.get_json()
    task_id = data.get("task_id")

    if task_id and task_id in task_threads:
        stop_flags[task_id].set()
        del task_threads[task_id]
        del stop_flags[task_id]
        return jsonify({"message": f"Stopped task {task_id}."})
    if not task_id:
    return jsonify({"message": "Task ID is required."}), 400

@app.route('/status')
def status():
    task_id = request.args.get('task_id')
    if not task_id:
        return jsonify({"error": "Task ID is required for status check"}), 400
    return jsonify(status_data.get(task_id, {
        "summary": {"success": 0, "failed": 0},
        "latest": {}
    }))

if __name__ == '__main__':
    app.run(debug=True)
