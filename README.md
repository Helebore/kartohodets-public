
### установка зависимостей
для фронта
```bash
npm install
````
для бека
```bash
pip install -e .
````
или
```bash
pip3 install -e .
````

после выполнения появятся папки `node_modules/` и `my_backend.egg-info/`. эти папки **не коммитим**

Если нужно поменять зависимости для питона, это можно сделать в backend/requirements.py

---
### локальный запуск

#### через бек
```bash
python backend/app.py
```
или 
```bash
python3 backend/app.py
```


#### через фронт способ 1 - через npm

```bash
npx serve .
```

согласиться на установку. перейти по адресу в терминале `http://localhost:3000`

#### через фронт способ 2 - через vscode

пкм на файл `index.html` -> Open with Live Server

Открывать `index.html` напрямую нельзя - для работы `three.js` нужен локальный сервер.


### щас запускать ТАК


первый запуск
```bash
npm install
python backend/app.py
````
потом
```bash
python backend/app.py
````