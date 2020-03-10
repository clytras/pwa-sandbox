require('dotenv').config();
const path = require('path');
const url = require('url');
const fg = require('fast-glob');
const fs = require('fs');
const mime = require('mime-types');
const cors = require('cors');
const express = require('express');
const app = express();

const port = process.env.PORT;

const UploadsDir = path.join(__dirname, 'storage/uploads');
function fullUrl(req) {
  return url.format({
    protocol: req.protocol,
    host: req.get('host'),
    pathname: req.originalUrl
  });
}

app.use(cors({ origin: true }));
  // .use(bodyParser.json())
  // .use(bodyParser.urlencoded({ extended: false }))
  // .use("/languages", require("./lib/languages/route"))

app.use(express.static('public'));
// app.engine('.ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


app.get('/', async function(req, res) {
  // res.send(`Hello World from express!!!!`);
  res.render('layout', {
    forFooter: null, // 'Testing var for footer!'
    some: {
      obj: {
        var: 'Testing var'
      }
    }
  });
});

app.get('/uploads', async function(req, res) {
  const data = await fg('*.*', { cwd: UploadsDir });
  res.json({ success: true, data });
});

app.get('/uploads/:filename', function(req, res) {
  const filename = req.params.filename;

  if(filename) {
    const filepath = path.join(UploadsDir, filename);
    const mimetype = mime.lookup(filename);

    const stream = fs.createReadStream(filepath);

    stream.on('open', function() {
      res.set('Content-Type', mimetype);
      stream.pipe(res);
    });

    stream.on('error', function() {
      res.status(404).render('error', { statusCode: 404 });
    });
  } else {
    res.status(404).render('error', { statusCode: 404 });
  }
});

app.put('/uploads/:filename', async function(req, res) {
  let filename = req.params.filename;

  if(filename) {
    const filepath = path.join(UploadsDir, filename);
    let exists = false;

    try {
      await fs.stat(filepath);
      exists = true;
    } catch(err) {}

    if(exists) {
      res.status(409).json({ success: false });
    } else {
      const stream = fs.createWriteStream(filepath);

      stream.on('close', function() {
        res.json({ success: true });
      });

      req.pipe(stream);
    }
  } else {
    res.status(409).json({ success: false });
  }
});

app.delete('/uploads/:filename', async function(req, res) {
  let filename = req.params.filename;

  if(filename) {
    const filepath = path.join(UploadsDir, filename);

    fs.unlink(filepath, err => {
      if(err) {
        res.status(409).json({ success: false });
      } else {
        res.json({ success: true });
      }
    });
  } else {
    res.status(409).json({ success: false });
  }
});

app.get("*", (_, res) => res.status(404).json({ success: false, data: "Endpoint not found" }));



// app.get('/', (req, res) => res.send('Hello World from express!!!!!'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`));