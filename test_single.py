import translate_es
with open('./es/hotel-to-hotel/index.html', 'r', encoding='utf-8') as f:
    text = f.read()
res = translate_es.translate_html(text)
if res:
    with open('./es/hotel-to-hotel/index.html', 'w', encoding='utf-8') as f:
        f.write(res)
    print("SUCCESS!")
else:
    print("FAILURE")
