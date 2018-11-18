var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8000;

var http = require('https');  
var jsdom = require('jsdom');
const { JSDOM } = jsdom;

var result = [];

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

var numUsers = 0;

io.on('connection', (socket) => {
  var addedUser = false;

  // emits 'new message'
  socket.on('new message', (data) => {
    var reg = /^[\u4e00-\u9fa5]{4,4}$/;
    if(!data.match(reg)) {
      //输入的不是四个汉字
      socket.emit('new message', {
        username: "Admin",
        message: "请输入四个汉字"
      });
      return;
    }

    //查询
    str = data;
    var transToUtf8 = function(pValue){
      return pValue.replace(/[^\u0000-\u00FF]/g, function($0){
          return escape($0).replace(/(%u)(\w{4})/gi,"$2");
      });
    }

    //拼接查询网址
    let utfCode = transToUtf8(str[3]);
    let urlRequest = 'https://chengyu.911cha.com/zi' + utfCode + '_1.html';
    //拼接验证输入网址
    let utfCode1 = transToUtf8(data[0]);
    let urlRequest1 = 'https://chengyu.911cha.com/zi' + utfCode1 + '_1.html';

    //验证输入的是否为成语
    http.get(urlRequest1,function(res){  
      var html='';  
      res.on('data',function(data){	
        html += data;  		
      });  
      res.on('end',function(){  
        const dom = new JSDOM(html);
        let string = dom.window.document.getElementsByClassName('f14')[1].textContent;
        let reg = /\〔(.+?)\〕/g;
        results = string.match(reg);
        if(results) {
          for(let i = 0; i < results.length; i++) {
            let temp = results[i].match(/[\u4e00-\u9fa5]/g);
            if(data == temp[0] + temp[1] + temp[2] + temp[3]) {
              //查询接龙成语
              http.get(urlRequest,function(res){  
                var html='';  
                res.on('data',function(data){	
                html += data;  		
            });  

            res.on('end',function(){  
                const dom = new JSDOM(html);
                let string = dom.window.document.getElementsByClassName('f14')[1].textContent;
                let reg = /\〔(.+?)\〕/g;
                results = string.match(reg);
                if(results) {
                      for(let i = 0; i < results.length; i++) {
                      let temp = results[i].match(/[\u4e00-\u9fa5]/g);
                      if(temp[3]) {
                        result.push(temp[0] + temp[1] + temp[2] + temp[3]);
                      }
                      //处理三字词语
                      else {
                        result.push(temp[0] + temp[1] + temp[2]);
                      }
                  }
                  socket.broadcast.emit('new message', {
                    username: "Admin",
                    message: result[0]
                  });
                  socket.emit('new message', {
                    username: "Admin",
                    message: result[0]
                  });
                  result = [];
                }
                else {
                  socket.emit('new message', {
                    username: "Admin",
                    message: "=。=找不到可以接龙的成语"
                  });
                }

            });  
              }); 
              return;
            }
          }
        } else {
          socket.emit('new message', {
            username: "Admin",
            message: "您输入的不是成语哦~"
          });
          return;
        }
      });  
    }); 


    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });


  socket.on('add user', (username) => {
    if (addedUser) return;


    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });

    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });


  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });


  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });


  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;


      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});