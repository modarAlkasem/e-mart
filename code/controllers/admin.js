const {validationResult} = require('express-validator');

const Product = require('../models/product');

const fileHelper = require('../util/file');

exports.getAddProduct=(req , res ,next)=>{

    
    res.render('admin/edit-product' , 
    {
        pageTitle : 'Add Product' ,
        path : '/admin/add-product' ,
        product:null ,
        editing:false,
        errorMessage : null,
        hasErrors : false,
        validationErrors : []
    });
}

exports.postAddProduct = (req , res , next)=>{
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    const errors = validationResult(req);
    if(!image){
        return res.status(422).render('admin/edit-product' , {
            path:'/admin/add-product',
            pageTitle:'Add Product',
            editing:false,
            errorMessage : 'Invalid attached image',
            hasErrors : true,
            product : {
                title:title,
                price:price,
                description : description
            },
            validationErrors :[{param:'image'}]
        });
    }
    if(!errors.isEmpty()){
        console.log(errors);
        return res.status(422).render('admin/edit-product' , {
            path:'/admin/add-product',
            pageTitle:'Add Product',
            editing:false,
            errorMessage : errors.array()[0].msg,
            hasErrors : true,
            product : {
                title:title,
                price:price,
                description : description
            },
            validationErrors : errors.array()
        });


    }
    const imageUrl = image.path;
    const product = new Product({
        title:title ,
        price : price,
        description:description,
        imageUrl:imageUrl,
        userId:req.user});
    product.save()
    .then(()=>{
        console.log('Created!')
        res.redirect('/admin/products')
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });

    
     
  }

exports.getEditProduct = (req , res, next)=>{

 
    const editMode = req.query.edit;
    const prodId= req.params.productId;
    if(!editMode){
        return res.redirect('/');
    }


    Product.findById(prodId)
    .then( product=>{
        
        if(!product){
            return res.redirect('/');
        }
        res.render('admin/edit-product' , {
            path:'/admin/edit-product',
            pageTitle:'Edit Product',
            editing:editMode,
            product : product,
            errorMessage : null,
            hasErrors : false,
            validationErrors : []
        });

    }) .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });


   
}

exports.postEditProduct = (req , res, next)=>{
    
    const prodId= req.body.productId;
    const updatedTitle = req.body.title;
    const updatedImage = req.file;
    const updatedPrice = req.body.price;
    const updatedDescription = req.body.description;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log(errors);
        return res.status(422).render('admin/edit-product' , {
            path:'/admin/edit-product',
            pageTitle:'Edit Product',
            editing:true,
            errorMessage : errors.array()[0].msg,
            hasErrors : true,
            product : {
                title:updatedTitle,
                price:updatedPrice,
                description : updatedDescription,
                _id :prodId
            },
            validationErrors : errors.array()
        });


    }
    Product.findById(prodId)
    .then(product=>{
        if(product.userId.toString()!== req.user._id.toString()){
            return res.redirect('/');
        }
        product.title = updatedTitle;
        product.price = updatedPrice;
        if(updatedImage){
            fileHelper.deleteFile(product.imageUrl);
            product.imageUrl = updatedImageUrl.path;
        }

        product.description = updatedDescription;
        return product.save().then(result=>{
            res.redirect('/admin/products');
        }).catch(err=>{
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
    }).catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });    


    
}

exports.getProducts = (req,res,next)=>{
  

    Product.find({userId:req.user._id})
    .then(products=>{
        console.log(products);
        res.render('admin/products' ,
        {prods: products ,
         pageTitle : 'Admin Products' ,
         path:'/admin/products'
          });
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });
}



exports.deleteProduct = (req,res,next)=>{
    const prodId= req.params.productId;
    Product.findById(prodId)
    .then(product=>{
        if(!product){
           return next(new Error('Product not found!')) 
        }
        fileHelper.deleteFile(product.imageUrl);

        return     Product.deleteOne({_id:prodId , userId:req.user._id})
    })
    .then(()=> {
        res.status(200).json({mesage:"Deleting Succeeded"})
        
    })
    
    .catch(err=>{
        return res.status(500).json({ message : "Server Error" })
    
    });

    
}