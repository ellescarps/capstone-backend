require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");


const JWT_SECRET = process.env.JWT_SECRET

const app = express();
const PORT = 3000;

const prisma = require("./prisma");
const { category } = require("./prisma");

app.use(cors({ origin: /localhost/ }));
app.use(express.json())
app.use(require("morgan")("dev"));



function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// ----- User ROUTES -------

// Register a new user
app.post("/api/register", async (req, res, next) => {
    try {
    const { name, email, password, isAdmin, locationId, shippingResponsibility, shippingOption, profilePicUrl } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            isAdmin,
            locationId,
            shippingResponsibility,
            shippingOption,
            profilePicUrl,
        },
    });
     res.json(user);  
    } catch (error) {
        next(error);
    }
});


// Login a user

app.post("/api/login", async (req,res, next) => {
      try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: {email}});
        if (!user) return res.status(400).json({ error: "Invalid email"})

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h"});
        res.json({ token });
    } catch (error) {
        next(error);
    }
});

// Get users
app.get('/api/users', async (req, res, next) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        next(error);
    }
});


// GET user profile
app.get("/api/users/:id", async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(req.params.id) },
        });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (error) {
        next(error);
    }
});

app.get("/api/users/:id/posts", async (req, res, next) => {
    const userId = parseInt(req.params.id, 10);
  
    try {
      const posts = await prisma.post.findMany({
        where: { userId: userId },
        include: {
          images: true,
          likes: true,
          favorites: true,
          comments: true,
        },
      });
  
      res.json(posts);
    } catch (error) {
        next(error);
    }
  });

// EDIT
app.put("/api/users/:id", authenticate, async (req, res, next) => {
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: req.body,
        });
        res.json(user);
    } catch (error) {
        next(error);
    }
});

// DELETE
app.delete("/api/users/:id", authenticate, async (req, res, next) => {
    try {
     await prisma.user.delete({ where: { id: parseInt(req.params.id)}});
     res.json({ message: "User deleted successfully" });
    } catch (error) {
      next(error);
    }
});


// ----- Post ROUTES -------

// GET ALL Posts
app.get("/api/posts", async (req, res, next) => {
    try {
        const { category } = req.query;

        const posts = await prisma.post.findMany({
            where: category
                ? {
                    category: {
                        name: {
                            equals: category,
                            mode:"insensitive",
                        },
                    },
                } : {},

            include: {
                user: true,
                category: true,
                location: true,
                images: true,
                media: true,
                likes: true,
                favorites: true,
                comments: true,
            },
        });
        res.json(posts);
    } catch (error) {
        next(error);
    }
});

// GET SINGLE Post
app.get("/api/posts/:id", async (req, res, next) => {
    try {
      const post = await prisma.post.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
            user: true,
            category: true,
            location: true,
            images: true,
            media: true,
            likes: true,
            favorites: true,
            comments: true,
        },
      });     
      res.json(post);
    } catch (error) {
        next(error);
    }
});

// CREATE a new post
app.post("/api/posts", authenticate, async (req, res, next) => {
    try {
        const {title,
            description,
            isAvailable,
            shippingCost,
            shippingResponsibility,
            shippingOption,
            isFeatured,
            categoryId,
            locationId,
            type,} = req.body;

            if (type !== 'post' && type !== 'callout') {
                return res.status(400).json({ error: 'Invalid type. Must be "post" or "callout".' });
              }

        const newPost = await prisma.post.create({
            data: {
                title,
                description,
                isAvailable,
                shippingCost,
                shippingResponsibility,
                shippingOption,
                isFeatured,
                type,
                userId: req.admin.id,
                categoryId,
                locationId,
            }
        });

          // Based on the type, you could perform different logic here
    if (newPost.type === 'post') {
        // Handle posts differently, e.g., add to giveaway section
      } else if (newPost.type === 'callout') {
        // Handle callouts differently, e.g., add to request section
      }

        res.json(newPost);
    } catch (error) {
        next(error);
    }
});

// EDIT
app.put("/api/posts/:id", async (req, res, next) => {
    try {
        const {
            title,
            description,
            isAvailable,
            shippingCost,
            shippingResponsibility,
            shippingOption,
            isFeatured,
            categoryId,
            locationId,
        } = req.body;
        
        const post = await prisma.post.update({
            where: { id: parseInt(req.params.id) },
            data: {
                title,
                description,
                isAvailable,
                shippingCost,
                shippingResponsibility,
                shippingOption,
                isFeatured,
                categoryId,
                locationId,
            },
        });
        res.json(post);
    } catch (error) {
        next(error);        
    }
});

// DELETE
app.delete("/api/delete/:id", authenticate, async (req, res, next) => {
    try {
        await prisma.post.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.json({ message: "Post deleted" });
    } catch (error) {
        next(error);
    }
});

// ----- Category ROUTES -------

// Get ALL
app.get("/api/categories", async (req, res, next) => {
    try {
        const categories = await prisma.category.findMany({
            include: {
                posts: true,
            },
        });
        res.json(categories);
    } catch (error) {
        next(error);
    }
});

// GET SINGLE
app.get("/api/categories/:id", async (req, res, next) => {
    try {
        const category = await prisma.category.findUnique({
            where: { id: parseInt(req.params.id) },
        });
        if (!category) return res.status(404).json({ error: "Category not found" });
        res.json(category);
    } catch (error) {
        next(error);
    }
});

// CREATE
app.post("/api/categories", authenticate, async (req, res, next) => {
    try {
        const { name } = req.body;
        const category = await prisma.category.create({
            data: { name },
        });
        res.json(category);
    } catch (error) {
        next(error);
    }
});

// EDIT Category (Admin Only)
app.put("/api/categories/:id", authenticate, async (req, res, next) => {
    try {
        if (!req.admin?.isAdmin) {
            return res.status(403).json({ error: "Forbidden: Only admins can perform this action" });
        }

        const { name } = req.body;
        const category = await prisma.category.update({
            where: { id: parseInt(req.params.id) },
            data: { name },
        });
        res.json(category);
    } catch (error) {
        next(error);
    }
});
// DELETE Category (Admin Only)
app.delete("/api/categories/:id", authenticate, async (req, res, next) => {
    try {
        if (!req.admin?.isAdmin) {
            return res.status(403).json({ error: "Forbidden: Only admins can perform this action" });
        }

        await prisma.category.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.json({ message: "Cateogry deletd" });
    } catch (error) {
        next(error);
    }
});


// ----- Location ROUTES -------

//  GET ALL
app.get("/api/locations", async (req, res, next) => {
    try {
        const locations = await prisma.location.findMany({
            include: {
                country:  true,
                users: true,
                posts: true,
            },
        });

        res.json(locations);
    } catch (error) {
        next(error);
    }
});
//  GET SINGLE 
app.get("/api/locations/:id", async (req, res, next) => {
    try {
        const locations = await prisma.location.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
               country: true,
               users: true,
               posts: true,
            },
        });
        if (!locations) return res.status(404).json({ error: "Location not found" });
        res.json(locations);
    } catch (error) {
        next(error);
    }
});

// Edit location (Admin Only)
app.put("/api/locations/:id", authenticate, async (req, res, next) => {
    try {
        if (!req.admin?.isAdmin) {
            return res.status(403).json({ error: "Forbidden: Only admins can perform this action" });
        }

       const { city, countryId, latitude, longitude } = req.body;
       const updated = await prisma.location.update({
        where: { id: parseInt(req.params.id) },
        data: { city, countryId, latitude, longitude },
       });
       res.json(updated);
    } catch (error) {
        next(error);
    }
});

// Delete location (Admin Only)
app.delete("/api/location/:id", authenticate, async (req, res, next) => {
    try {
        if (!req.admin?.isAdmin) {
            return res.status(403).json({ error: "Forbidden: Only admins can perform this action" });
        }

        await prisma.location.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.json({ message: "Location deleted"});
    } catch (error) {
        next(error);
    }
});

// ----- Messages ROUTES -------
app.get("/api/messages", authenticate, async (req, res, next) => {
    try {
        const userId = req.admin?.id;
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId },
                ],
            },
            include: {
                sender: true,
                receiver: true,
            },
            orderBy: {
                timestamp: 'desc',
            },
        });
        res.json(messages);
    } catch (error) {
        next(error);
    }
});

app.get("/api/messages/:id", authenticate, async (req, res, next) => {
    try {
        const message = await prisma.message.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                sender: true,
                receiver: true,
            },
        });

        const userId = req.admin?.id;
        if (
            !message ||
            (message.senderId !== userId && message.receiverId !== userId)
        ) {
            return res.status(403).json({ error: "Forbidden" });
        }
        res.json(message);
    } catch (error) {
        next(error);
    }
});

app.post("/api/messages", authenticate, async (req, res, next) => {
    try {
        const senderId = req.admin?.id;
        const { receiverId, content } = req.body;

        const newMessage = await prisma.message.create({
            data: {
                content,
                senderId,
                receiverId,
            },
        });
        res.json(newMessage);
    } catch (error) {
        next(error);
    }
});

app.delete("/api/messages/:id", authenticate, async (req, res, next) => {
    try {
        const userId = req.admin?.id;
        const message = await prisma.message.findUnique({
            where: { id: parseInt(req.params.id) },
        });

        if (
            !message || 
            (message.senderId !== userId && message.receiverId !== userId)
        ) {
            return res.status(403).json({ error: "Forbidden" });
        }

        await prisma.message.delete({
            where: { id: parseInt(req.params.id) },
        });

        res.json({ message: "Message deleted" });
    } catch (error) {
        next(error);
    }
});

// ----- Follow ROUTES -------
app.get("/api/following", authenticate, async (req, res, next) => {
    try {
        const userId = req.admin?.id;

        const following = await prisma.follow.findMany({
            where: { followerId: userId},
            include: {
                following: true,
            },
        });

        res.json(following.map(f => f.following));
    } catch (error) {
        next(error);
    }
});

app.get("/api/followers", authenticate, async (req, res, next) => {
    try {
        const userId = req.admin?.id;
        
        const followers = await prisma.follow.findMany({
            where: { followingId: userId },
            include: {
                follower: true,
            },
        });

        res.json(followers.map(f => f.follower));
    } catch (error) {
        next(error);
    }
});


app.post("/api/follow/:userId", authenticate, async (req, res, next) => {
    try {
        const followerId = req.admin?.id;
        const followingId = parseInt(req.params.userId);
        
        if (followerId === followingId) {
            return res.status(400).json({ error: "You cannot follow yourself"});
        }

        const follow = await prisma.follow.create({
            data: {
                followerId,
                followingId,
            },
        });

        res.status(201).json(follow);
    } catch (error) {
        next(error);
    }
});

app.delete("/api/unfollow/userId", authenticate, async (req, res, next) => {
    try {
        const followerId = req.admin?.id;
        const followingId = parseInt(req.params.userId);

        await prisma.follow.delete({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });

        res.json({ message: "Unfollow successfully" });
    } catch (error) {
        next(error);
    }
});

// ----- Collection ROUTES -------
app.get("/api/collections", async (req, res, next) => {
    try {
        const userId = req.admin?.id;

        const collections = await prisma.collection.findMany({
            where: { userId },
            include: {
                posts: true,
            },
        });

        res.json(collections);
    } catch (error) {
        next(error);
    }
});

app.post("/api/collections", authenticate, async (req, res, next) => {
    try {
        const userId = req.admin?.id;
        const { name } = req.body;

        const collection = await prisma.collection.create({
            data: {
                name,
                userId,
            },
        });

        res.status(201).json(collection);
    } catch (error) {
        next(error);
    }
});

app.post("/api/collections/:id/add", authenticate, async (req, res, next) => {
    try {
        const { postId } = req.body;
        const id = parseInt(req.params.id);
        
        const collection = await prisma.collection.update({
            where: { id: id },
            data: {
                posts: {
                    connect: { id: postId },
                },
            },
            include: { posts: true },
        });

        res.json(collection);
    } catch (error) {
        next(error);
    }
});

app.delete("/api/collections/:id/remove", authenticate, async (req, res, next) => {
    try {
     const { postId } = req.body;
     const id = parseInt(req.params.id);

    const collection = await prisma.collection.update({
        where: { id: id },
        data: {
            posts: {
                disconnect: { id: postId },
            },
        },
        include: { posts: true },
    });
     
     res.json(collection);
    } catch (error) {
       next(error); 
    }
});

app.delete("/api/collections/:id", authenticate, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        await prisma.collection.delete({
            where: { id: id },
        });

        res.json({ message: "Collection deleted" });
    } catch (error) {
      next(error);
    }
});

// ----- Image ROUTES ------- 
app.get("/api/images", async (req, res, next) => {
    try {
        const images = await prisma.image.findMany({
            include: {
                post: true,
            },
        });

        res.json(images);
    } catch (error) {
        next(error);
    }
});

app.get("/api/posts/:postId/images", async (req, res, next) => {
    try {
        const postId = parseInt(req.params.postId);

        const images = await prisma.image.findMany({
            where: { postId },
        });

        res.json(images);
    } catch (error) {
       next(error); 
    }
});

app.post("/api/posts/:postId/images", authenticate, async (req, res, next) => {
    try {
        const postId = parseInt(req.params.postId);
        const { url } = req.body;

        const image = await prisma.image.create({
            data: {
                url,
                postId,
            },
        });
    } catch (error) {
        next(error);
    }
});

app.delete("/api/images/:id", authenticate, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        
        await prisma.image.delete({
            where: { id },
        });

        res.json({ message: "Image deleted" });
    } catch (error) {
        next(error);
    }
});


// ----- Media ROUTES -------

app.get("/api/media", async (req, res, next) => {
    try {
        const media = await prisma.media.findMany({
            include: {
                post: true,
            },
        });
        
        res.json(media);
    } catch (error) {
        next(error);
    }
});

app.get("/api/posts/:postId/media", async (req, res, next) => {
    try {
        const postId = parseInt(req.params.postId);

        const media = await prisma.media.findMany({
            where: { postId },
        });
            res.json(media);
    } catch (error) {
        next(error);
    }
});


app.post("/api/posts/:postId/media", authenticate, async (req, res, next) => {
    try {
        const postId = parseInt(req.params.postId);
        const { type, url } = req.body;

        const newMedia = await prisma.media.create({
            data: {
                type,
                url,
                postId,
            },
        });

        res.status(201).json(newMedia);
    } catch (error) {
        next(error);
    }
});

app.delete("/api/media/:id", authenticate, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        await prisma.media.delete({
            where: { id },
        });

        res.json({ message: "Media item deleted" });
    } catch (error) {
        next(error);
    }
});



app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status ?? 500;
    const message = err.message ?? 'Internal server error.';
    res.status(status).json({ message });
  });
  
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}.`);
  });