const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

const server = jsonServer.create()
const router = jsonServer.router('./database.json')

server.use(bodyParser.urlencoded({extended: true}))
server.use(bodyParser.json())
server.use(jsonServer.defaults());

const SECRET_KEY = '123456789'

const expiresIn = '1h'

// Tạo token từ dữ liệu nhập vào
function createToken(payload){
  return jwt.sign(payload, SECRET_KEY, {expiresIn})
}

// Kiểm tra có token chưa 
function verifyToken(token){
  return  jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ?  decode : err)
}

// Kiểm tra email đã tồn tại chưa?
function isAuthenticated({email}){
  let userdb = JSON.parse(fs.readFileSync('./database.json', 'UTF-8'))
  return userdb.users.findIndex(user => user.email === email) !== -1;
}
function isAuthenticateds({email,password}){
  let userdb = JSON.parse(fs.readFileSync('./database.json', 'UTF-8'))
  return userdb.users.findIndex(user => user.email === email && user.password===password) !== -1;
}
// Đăng ký tài khoản
server.post('/register', (req, res) => {
    const {customerName,email,password} = req.body;
    if(isAuthenticated({email}) === true) {
      const status = 401;
      const message = 'Email đã tồn tại';
      res.status(status).json({status, message});
      return
    }
  // Đọc file , kiểm lỗi => Đưa user vào file
  fs.readFile("./database.json", (err, data) => {  
    if (err) {
      const status = 401
      const message = err
      res.status(status).json({status, message})
      return
    }
    // Lấy dữ liệu nhập vào
    var data = JSON.parse(data.toString());
    // Thiết lập id cho user
    if(data.users.length == 0 ) {
    var last_item_id = 1;
    }else{
      var last_item_id = data.users.length +1;
    }
    //Thêm user vào danh sách
    data.users.push({id: last_item_id,customerName:customerName, email: email, password: password}); 
    var writeData = fs.writeFile("./database.json", JSON.stringify(data), (err, result) => {  // viết vào file database.json
        if (err) {
          const status = 401
          const message = err
          res.status(status).json({status, message})
          return
        } else {
          const status = 200
          const message ="Đăng ký thành công"
          res.status(status).json({status, message})
        }
    });
});

})

// Đăng nhập, kiểm tra có tồn tại ?, và tạo token
server.post('/login', (req, res) => {
  const {email, password} = req.body;
  let userdb = JSON.parse(fs.readFileSync('./database.json', 'UTF-8')).users;
  let customerName;
  userdb.forEach(user => {
    if(user.email === email) {
      customerName = user.customerName;
    }
  })
  if (isAuthenticateds({email, password}) === false) {
    const status = 401
    const message = 'Incorrect email or password'
    res.status(status).json({status, message})
    return
  }
  const access_token = createToken({email, password})
  res.status(200).json({customerName,access_token})
})

//Xem toàn bộ danh sách users
server.get('/users', ((req, res)=> {
  let userdb = JSON.parse(fs.readFileSync('./database.json', 'UTF-8')).users;
  const status = 200
  res.status(status).json({status, userdb})
  return
}))

//Xem thông tin user theo id
server.get('/users/:id', ((req, res)=> {
  let userdb = JSON.parse(fs.readFileSync('./database.json', 'UTF-8'));
  let id = req.params.id;
 
  let result = userdb.users.filter(user =>  user.id == id)

  const status = 200
    
  res.status(status).json({status, result})
  return
}))

//Xác định order sản phẩm
server.post('/orders', (req, res, next) => {
  // check token
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Error in authorization format'
    res.status(status).json({status, message})
    return
  }
  try {
     let verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);
     if (verifyTokenResult instanceof Error) {
       const status = 401
       const message = 'Access token not provided'
       res.status(status).json({status, message})
       return
     }
     fs.readFile("./database.json", (err, data) => {  
       if (err) {
         const status = 401
         const message = err
         res.status(status).json({status, message})
         return
        };
        
        // Get current book data
        var data = JSON.parse(data.toString());
        // Get the id of last user
        var book_id = req.body.bookId;
        var customerName = req.body.customerName
        let book = {};
        //Add new user
        data.books.forEach(item =>{
          if (item.id == book_id){
            book = {
                    id: Math.floor(Math.random() * 100),
                    bookId: item.id,
                    customerName: customerName,
                    createdBy: 123,
                    quantity: 1,
                    timestamp: 1
                  }
            data.orders.push(book)
          }
        })
        var writeData = fs.writeFile("./database.json", JSON.stringify(data), (err, result) => {  // WRITE
          if (err) {
            const status = 401
            const message = err
            res.status(status).json({status, message})
            return
          } else {
            const status = 201
            const message ="Đặt hàng thành công"
            const bookId= book.bookId;
            const orderId = book.id;
            res.status(status).json({status, message,bookId, orderId})
            return
          }
        });
        return
      });
     
  } catch (err) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({status, message})
  }
  })

  //Xem toàn bộ danh sách orders
server.get('/orders', ((req, res)=> {
  //Kiểm tra token
  let token = req.headers.authorization;
  if (token === undefined || token.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Error in authorization formats'
    res.status(status).json({status, message})
    return
  }
  try {
     let verifyTokenResult = verifyToken(token.split(' ')[1]);
      
     if (verifyTokenResult instanceof Error) {
       const status = 401
       const message = 'Access token not provided'
       res.status(status).json({status, message})
       return
     }
     //Thiết lập ordersdb từ file database.json
    let ordersdb = JSON.parse(fs.readFileSync('./database.json', 'UTF-8')).orders;
    const status = 200
    res.status(status).json({status, ordersdb})
    return
  } catch (error) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({status, message})
  }
}))

//Xem thông tin order theo id
server.get('/orders/:id', ((req, res)=> {
  // Kiểm tra token
  let token = req.headers.authorization;
  console.log(req.headers.authorization);
  if (token === undefined || token.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Error in authorization formats'
    res.status(status).json({status, message})
    return
  }
  try {
    let verifyTokenResult;
       verifyTokenResult = verifyToken(token.split(' ')[1]);
      
     if (verifyTokenResult instanceof Error) {
       const status = 401
       const message = 'Access token not provided'
       res.status(status).json({status, message})
       return
     }
     //Thiết lập ordersdb từ file database.json || Gắn biến cho id vừa nhập vào
    let ordersdb = JSON.parse(fs.readFileSync('./database.json', 'UTF-8')).orders;
    let id = req.params.id;

    let result = ordersdb.filter(user =>  user.id == id)

    const status = 200
    res.status(status).json({status, result})
    return
  } catch (error) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({status, message})
  }
}))

//Xóa order theo id
server.delete('/orders/:id', ((req, res)=> {
  // Kiểm tra token
  let token = req.headers.authorization;
  if (token === undefined || token.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Error in authorization format'
    res.status(status).json({status, message})
    return
  }
  try {
    let verifyTokenResult;
       verifyTokenResult = verifyToken(token.split(' ')[1]);
      
     if (verifyTokenResult instanceof Error) {
       const status = 401
       const message = 'Access token not provided'
       res.status(status).json({status, message})
       return
     }
  // Gắn biến cho id nhập vào
  let id = req.params.id;
  let deletedOrder;
  fs.readFile("./database.json", (err, data) => {  
    if (err) {
      const status = 401
      const message = err
      res.status(status).json({status, message})
      return
     };
     
     // Lấy dữ liệu trong file database.json
     var data = JSON.parse(data.toString());
     let d = 0;
     data.orders.filter((order,index)=> {
      if(order.id == id) {
          deletedOrder = data.orders.splice(index,1)
      }else {
        d++
      }
     })
     if(d == data.orders.length) {
      const status = 401
      const message = "Không có sách nào."
      res.status(status).json({status, message})
      return
     }
  var writeData = fs.writeFile("./database.json", JSON.stringify(data), (err) => {  // viết vào file database.json
    if (err) {
      const status = 401
      const message = err
      res.status(status).json({status, message})
      return
    }else {
      const status = 200
      const message = "Đã Xóa thành công";
      res.status(status).json({status,message,  deletedOrder})
      return
    }
});
    })
  } catch (error) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({status, message})
  }
}))
//Cập nhật lại tên người mua của order
server.patch('/orders/:id', ((req, res)=> {
   // Kiểm tra token
   let token = req.headers.authorization;
   console.log(req.headers.authorization);
   if (token === undefined || token.split(' ')[0] !== 'Bearer') {
     const status = 401
     const message = 'Error in authorization format'
     res.status(status).json({status, message})
     return
   }
   try {
    let verifyTokenResult;
    verifyTokenResult = verifyToken(token.split(' ')[1]);
   
    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({status, message})
      return
    }
    fs.readFile("./database.json", (err, data) => {  
      if (err) {
        const status = 401
        const message = err
        res.status(status).json({status, message})
        return
       };
       // Lấy dữ liệu trong file database.json
       var data = JSON.parse(data.toString());
       // Đặt biến cho tên người mua
       var customerName =req.body.customerName
       let orderId = req.params.id;
       let d = 0;
       let orderNew ;
       //Cập nhật lại tên cho hóa đơn 
       data.orders.forEach(order => {
        if(order.id == orderId) {
          order.id= order.id,
          order.bookId= order.book,
          order.customerName= customerName,
          order.createdBy= 123,
          order.quantity= 1,
          order.timestamp= 1
          orderNew = order;
        }else {
          d++;
        }
       })
       if(d == data.orders.length) {
        const status = 401
        const message = "Không có hóa đơn để cập nhật"
        res.status(status).json({status, message})
        return
       }
       var writeData = fs.writeFile("./database.json", JSON.stringify(data), (err, result) => {  // WRITE
         if (err) {
           const status = 401
           const message = err
           res.status(status).json({status, message})
           return
         }else {
           const status = 200
           const message ="Cập nhật thành công"
           res.status(status).json({status, message,orderNew})
           return
         }
       });
       return
     });
   } catch (error) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({status, message})
   }
}))
server.use(router)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Our app is running on port ${ PORT }`);
})