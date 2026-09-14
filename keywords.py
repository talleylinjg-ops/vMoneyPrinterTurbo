ZH_EN = {
    "人工智能": "artificial intelligence technology",
    "AI": "artificial intelligence",
    "科技": "technology innovation",
    "生活": "daily life lifestyle",
    "日常": "everyday life",
    "改变": "future change",
    "城市": "city skyline urban",
    "自然": "nature landscape",
    "海洋": "ocean sea underwater",
    "森林": "forest trees sunlight",
    "山": "mountain landscape",
    "咖啡": "coffee cafe",
    "阅读": "reading books",
    "教育": "education school",
    "健康": "healthy lifestyle",
    "运动": "fitness workout sport",
    "旅行": "travel adventure",
    "春天": "spring flowers",
    "夏天": "summer beach",
    "秋天": "autumn leaves",
    "冬天": "winter snow",
    "太空": "space galaxy",
    "能源": "clean energy solar",
    "机器人": "robotics robot",
    "工作": "office work",
    "创意": "creative work design",
    "习惯": "healthy habits",
    "历史": "history documentary",
    "飞行": "airplane flight",
    "深海": "deep ocean",
    "种子": "plant seed growth",
    "未来": "futuristic city",
    "商业": "business meeting",
    "金融": "finance stock",
    "美食": "food cooking",
    "音乐": "music concert",
    "家庭": "family home",
    "孩子": "children playing",
    "宠物": "pets animals",
    "汽车": "car driving",
    "建筑": "architecture building",
    "夜晚": "night city lights",
    "早晨": "morning sunrise",
    "雨": "rain weather",
    "雪": "snow winter",
    "花": "flowers garden",
    "水": "water river",
    "火": "fire flame",
    "太阳": "sun sunlight",
    "月亮": "moon night sky",
    "星空": "starry sky",
    "电脑": "computer coding",
    "手机": "smartphone mobile",
    "网络": "internet network",
    "数据": "data analytics",
    "医疗": "medical hospital",
    "农业": "farm agriculture",
    "工厂": "factory industry",
    "环保": "environment green",
    "气候": "climate earth",
    "动物": "wildlife animals",
    "鸟": "birds flying",
    "猫": "cat pet",
    "狗": "dog pet",
    "人": "people walking",
    "微笑": "people smiling",
    "思考": "thinking portrait",
    "成功": "success celebration",
    "团队": "teamwork office",
    "会议": "business meeting",
    "学习": "studying library",
    "科学": "science laboratory",
    "化学": "chemistry lab",
    "物理": "physics science",
    "宇宙": "universe cosmos",
    "地球": "earth planet",
    "中国": "china city",
    "北京": "beijing city",
    "上海": "shanghai city",
    "风景": "scenic landscape",
    "公路": "highway road",
    "火车": "train railway",
    "飞机": "airplane airport",
    "船": "ship ocean",
    "桥": "bridge city",
    "公园": "park greenery",
    "街道": "street city",
    "灯光": "city lights night",
    "云": "clouds sky",
    "风": "wind nature",
}


def subject_to_terms(subject: str, extra: str = "") -> list[str]:
    terms: list[str] = []
    extra = (extra or "").strip()
    if extra:
        for part in extra.replace("，", ",").replace("、", ",").split(","):
            word = part.strip()
            if word:
                terms.append(word)
    text = subject or ""
    for zh, en in ZH_EN.items():
        if zh in text and en not in terms:
            terms.append(en)
    ascii_words = [
        w for w in text.replace(",", " ").split() if w.isascii() and w.isalpha() and len(w) > 2
    ]
    terms.extend(ascii_words)
    if not terms:
        terms = ["nature landscape", "city lifestyle", "technology"]
    seen = set()
    unique = []
    for t in terms:
        key = t.lower()
        if key not in seen:
            seen.add(key)
            unique.append(t)
    return unique[:8]
