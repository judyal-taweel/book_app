'use strict';
const PORT = 3000;
require('dotenv').config();

const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const methodoverride = require('method-override');
const app = express();
const client = new pg.Client(process.env.DATABASE_URL);

client.connect().then(() => {
    console.log('Runnnnnnnnnn');
});

app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(methodoverride('_method'));
app.use(express.static(__dirname + '/public'));

function Book(obj) {
    console.log(obj.industryIdentifiers ? obj.industryIdentifiers[0].identifier: 'kdkdk');
    this.img = obj.imageLinks ? obj.imageLinks.thumbnail.replace('http', 'https') : 'https://i.imgur.com/J5LVHEL.jpg',
        this.title = obj.title,
        this.author = obj.authors,
        this.description = obj.description || 'there is No description about this book yet !!',
        this.isbn = (obj.industryIdentifiers && obj.industryIdentifiers[0].identifier) ? obj.industryIdentifiers[0].identifier : 'No ISBN'

    }
//home page reatrive all data form Db done 
app.get('/', (req, res) => {
    let sql = 'SELECT books.id, AUTHORS.name ,books.title,books.description ,books.imge_url FROM books join AUTHORS on books.author_id = AUTHORS.id';
    client.query(sql).then((result) => {
        console.log(result.rows);
        
        res.render('pages/index', { result: result.rows, count: result.rowCount });
    })
});

app.get('/update/:id', (req, res) => {
    let sql = `SELECT books.id, AUTHORS.name ,books.title,books.description ,books.imge_url FROM books join AUTHORS on books.author_id = AUTHORS.id WHERE books.id=$1`
    client.query(sql, [req.params.id]).then(result => {
        res.render('pages/books/update', { data: result.rows[0] });
    }).catch(err => console.log('Error While Retriving the book', err))
});


//part  2 select specific one 
//part  2 select specific one 
app.get('/books/:id', (req, res) => {
    console.log(req.params.id);
    let sql = `SELECT books.id, AUTHORS.name ,books.title,books.description ,books.imge_url FROM books join AUTHORS on books.author_id = AUTHORS.id WHERE books.id=$1`
    client.query(sql, [req.params.id]).then(result => {
        console.log(result.rows);
        res.render('pages/books/detail', { data: result.rows[0] });
    }).catch(err => console.log('Error While Retriving the book', err))
});

app.get('/search/new', (req, res) => res.render('pages/searches/new'));

app.post('/searches', createSearch);



app.post('/addFav', (req, res) => {
    let author = req.body.author;
    let sql2 = `SELECT * from AUTHORS WHERE name=$1`;
    let sql = `INSERT INTO books (author_id,title,isbn,imge_url,description) VALUES ($1,$2,$3,$4,$5) RETURNING * `;
    let newAutour = `INSERT INTO authors(name) VALUES ($1) RETURNING *`;

    client.query(sql2, [author]).then(data => {
        console.log(data.rows);
        if (data.rows.length > 0) {
            let values = [data.rows[0].id, req.body.title, req.body.isbn, req.body.imge_url, req.body.description];
            client.query(sql, values).then((result) => {
            }).catch(err => console.log('ERRRRRRRRRRROR',err));
        } else {
            console.log(newAutour);
            client.query(newAutour, [author]).then(data2 => {
                let newAutid=data2.rows[0].id;
                client.query(sql,[newAutid,req.body.title, req.body.isbn, req.body.imge_url, req.body.description]).then((result) => {
                }).catch(err => console.log('ERROR while adding the authour to DBD'));
            }).catch(err => console.log('ELSE ',err))
        }
    }).catch(err => console.log('ERROR in sql 2',err))
    res.redirect('/');
})

app.put('/update/:id', (req, res) => {
    const id = req.params.id;
    console.log(id);
    console.log(req.body);
    const { title, description } = req.body;
    let sql = `UPDATE books SET title=$1,description=$2 WHERE id=$3`;
    let values = [title,  description, id];
    console.log(req.body.description);
    client.query(sql, values).then(data => {
        res.redirect(`/books/${id}`);
    }).catch(err => console.log('update went wroung !!', err))


});
app.delete('/delete/:id',(req,res)=>{
    const id =req.params.id;
    let sql = `DELETE FROM books WHERE id=$1`;
    client.query(sql,[id]).then(res.redirect('/')).catch(err=>console.log('ERROR While DELETE ',err))
})


function createSearch(request, response) {
    let url = 'https://www.googleapis.com/books/v1/volumes?q=';
    if (request.body.search[1] === 'title') { url += `+intitle:${request.body.search[0]}`; }
    if (request.body.search[1] === 'author') { url += `+inauthor:${request.body.search[0]}`; }
    superagent.get(url)
        .then(apiResponse => {
            return apiResponse.body.items
                .map(bookResult => {
                    return new Book(bookResult.volumeInfo)
                })
        })
        .then(results => response.render('pages/searches/show', { searchResults: results }))
}


app.listen(process.env.PORT || PORT, () => console.log(`Server Run at port : ${PORT}`))