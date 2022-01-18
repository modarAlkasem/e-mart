const path = require('path');

const fs = require('fs');

const Product = require('../models/product');

const Order = require('../models/order');

const PDFDocument = require('pdfkit');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const ITEMS_PER_PAGE = 3;

exports.getProducts = (req,res,next)=>{

    const page = +req.query.page || 1;
    let totalProducts;
    Product.find().countDocuments()
    .then(numProducts=>{
        totalProducts = numProducts;
        return Product.find()
        .skip((page-1)*ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then(products=>{
        res.render('shop/product-list' , {
            prods: products ,
            pageTitle : 'Products' ,
            path:'/products',
            currentPage:page,
            hasNextPage : page * ITEMS_PER_PAGE<totalProducts,
            hasPreviousPage : page-1 >= 1,
            nextPage : page+1,
            previousPage : page-1,
            lastPage : Math.ceil(totalProducts/ITEMS_PER_PAGE)


        });
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });


    
}

exports.getProduct = (req , res, next)=>{
    const prodId  = req.params.productId ;
     Product.findById(prodId)
     .then(product=>{
        res.render(
        "shop/product-detail"
         , {product:product
            , pageTitle:product.title 
            , path:'/products'
        })
     })
     .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });
  
}

exports.getIndex = (req , res , next)=>{

    const page = +req.query.page || 1;
    let totalProducts;
    Product.find().countDocuments()
    .then(numProducts=>{
        totalProducts = numProducts;
        return Product.find()
        .skip((page-1)*ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then(products=>{
        res.render('shop/index' , {
            prods: products ,
            pageTitle : 'E-Mart' ,
            path:'/',
            currentPage:page,
            hasNextPage : page * ITEMS_PER_PAGE<totalProducts,
            hasPreviousPage : page-1 >= 1,
            nextPage : page+1,
            previousPage : page-1,
            lastPage : Math.ceil(totalProducts/ITEMS_PER_PAGE)


        });
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });

  
}

exports.getCart  = (req , res , next)=>{

   req.user
    .populate('cart.items.productId')
    .then(user=>{
        const products = user.cart.items
        res.render('shop/cart' , {
            path:'/cart',
            pageTitle : 'Your Cart',
            cartProducts : products
                   });
    })

    


}

exports.postCart = (req , res , next)=>{
     const prodId = req.body.productId;
     Product.findById(prodId)
     .then(product=>{
        req.user.addToCart(product)
         .then(result=>{
            res.redirect('/cart');
         })
     })
     .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });

    




   


}

exports.postCartDeleteItem = (req , res , next)=>{
    
    const prodId = req.body.productId;
    req.user
    .removeFromCart(prodId)
    .then(()=>{
       
            res.redirect('/cart');
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });

}


exports.getCheckout = (req , res , next)=>{
    let totalSum=0 ; 
   req.user
   .populate('cart.items.productId')
   .then(user=>{
       const products = user.cart.items;
       products.forEach(prod=>{
           totalSum += prod.quantity  * prod.productId.price;
           
       })
       
       res.render('shop/checkout' , {
           path:'/checkout',
           pageTitle : 'Checkout',
           products : products,
           totalSum : totalSum,
           stripePK : process.env.STRIPE_PUBLISHABLE_KEY
                  });
                })
    .catch(err=>{
        throw new Error(err);
    })
}

exports.getOrders  = (req , res , next)=>{
   Order.find({"user.userId":req.session.user._id})
    .then(orders=>{
        res.render('shop/orders' , {
            path:'/orders',
            pageTitle : 'Your Orders',
            orders:orders
        });
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });


}

exports.postOrder = (req , res , next)=>{
    const token = req.body.stripeToken; 
    let totalSum = 0;
  
    req.user
    .populate('cart.items.productId')
    .then(user=>{
        user.cart.items.forEach(p => {
            totalSum += p.quantity * p.productId.price;
          });
        const products = user.cart.items.map(i=>{
            
            return {
                product:{...i.productId._doc},
                quantity : i.quantity
            }
        });
        const order = new Order({
            user:{
                email:req.user.email,
                userId : req.user
            },
            products : products
        });
        return order.save();
    })
     .then((result)=>{
        const charge = stripe.charges.create({
            amount: totalSum * 100,
            currency: 'usd',
            description: 'Demo Order',
            source: token,
            metadata: { order_id: result._id.toString() }
          });
          return   req.user.clearCart();
            
        })
    .then(()=>{
        res.redirect('/orders');
    })
    
}

exports.getInvoice = (req , res , next)=>{
    const orderId = req.params.orderId ; 
    
    Order.findById(orderId)
    .then(order=>{
        if(!order){
            
            return next(new Error('Order not found!'));
         
        }
        if(order.user.userId.toString() !== req.user._id.toString() ){
            
            return next(new Error ('Not authorized!'))
        }
        const fileName = 'invoice-' + orderId+'.pdf';
   
        const filePath = path.join('storage' , 'invoices' , fileName);

        let totalPrice = 0;

        const pdfDocument = new PDFDocument();
        res.setHeader('Content-Type' , 'application/pdf');
        res.setHeader('Content-Disposition' , 'inline; filename="'+fileName+'"');
        pdfDocument.pipe(fs.createWriteStream(filePath));
        pdfDocument.pipe(res);
        pdfDocument.fontSize(24).text('Invoice');
        pdfDocument.text('-----------------------');
        order.products.forEach(prod=>{
            totalPrice += prod.quantity * prod.product.price;
            pdfDocument.fontSize(12).text(
                `${prod.product.title} - ${prod.quantity}x - $${prod.product.price }`
            )
        })
        pdfDocument.text('---------');
        pdfDocument.fontSize(20).text(`Total Price : $${totalPrice}`);

        pdfDocument.end();

    })
    .catch(err=>{
        next(new Error(err));
    })
    

}