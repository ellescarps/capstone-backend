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
app.use(express.json());
app.use(require("morgan")("dev"));



function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// ----- User ROUTES -------

// Step 1: Register basic user info (name, email, password)
app.post("/api/register-step1", async (req, res, next) => {
    try {
        const { username, name, email, password } = req.body;

        if (!username || !name || !email || !password) {
            return res.status(400).json({ message: "Username, name, email, and password are required." });
        }

        const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
        const existingUserByUsername = await prisma.user.findUnique({ where: { username } });

        if (existingUserByEmail) {
            return res.status(400).json({ message: "Email is already registered." });
        }

        if (existingUserByUsername) {
            return res.status(400).json({ message: "Username is already taken." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { 
                username,
                name, 
                email, 
                password: hashedPassword, 
                isAdmin: false,
                profilePicUrl: "https://images.unsplash.com/photo-1584974292709-5c2f0619971b?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            },
        });

        res.json({ 
            message: "Step 1 completed. Please proceed to Step 2.",
            userId: user.id,
        });
        
    } catch (error) {
        next(error);
    }
});

// Step 2: Complete the registration process with additional fields (city, country, etc.)
app.post("/api/register-step2", async (req, res, next) => {
    try {
        const { userId, city, country, shippingResponsibility, shippingOption, profilePicUrl } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required to update profile." });
        }

        const validShippingOptions = ["PICKUP", "SHIPPING", "DROPOFF"];
        const validOption = validShippingOptions.includes(shippingOption) ? shippingOption : "PICKUP"; 

        const validShippingResponsibilities = ["GIVER", "RECEIVER", "SHARED"];
        const validResponsibility = validShippingResponsibilities.includes(shippingResponsibility) ? shippingResponsibility : "RECEIVER";  

        const user = await prisma.user.update({
            where: { id: userId },
            data: { 
                city, 
                country, 
                shippingOption: validOption,
                shippingResponsibility: validResponsibility, 
                profilePicUrl },
        });

        res.json({ message: "Registration complete.", user });

    } catch (error) {
        next(error);
    }
});

// Login a user

app.post("/api/login", async (req,res, next) => {
    console.log(req.body); 
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: "Invalid email" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
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
        // Validate that the id is a valid integer
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ error: `User with ID ${userId} not found` });
        }

        res.json(user);
    } catch (error) {
        console.error("Error fetching user data:", error); 
        next(error);
    }
});

app.put('/api/users/:id', authenticate, async (req, res) => {
    const userId = req.params.id;
    
    // Ensure that the logged-in user is trying to update their own profile
    if (parseInt(userId) !== req.user.id) {
        return res.status(403).json({ error: "You can only update your own profile" });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: req.body, // We expect the body to contain updated fields
        });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});


app.delete("/api/users/:id", authenticate, async (req, res) => {
    const userId = req.params.id;
    
    // Ensure that the logged-in user is trying to delete their own account
    if (parseInt(userId) !== req.user.id) {
        return res.status(403).json({ error: "You can only delete your own profile" });
    }

    try {
        await prisma.user.delete({ where: { id: parseInt(userId) } });
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
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
                images: true,
                media: true,
                likes: true,
                favorites: true,
                comments: true,
                collections: true,
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


// Get posts or callouts by a specific user
app.get('/api/posts/users/:id', async (req, res, next) => {
    const { id } = req.params; 
    const { type } = req.query;  // Default to 'post' if no type is provided

    const userId = parseInt(id);
    if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
    }

    try {
        const posts = await prisma.post.findMany({
            where: {
                userId: userId,
                type: type,  // Ensure the type filter is applied
            },
        });

        if (posts.length === 0) {
            console.log("No posts found for this user with type:", type);
        }

        res.json(posts);
    } catch (error) {
        console.error("Error fetching posts:", error);  // Log the error for debugging
        res.status(500).json({ error: "Error fetching posts" });
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
            city,
            country,
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
                userId: req.user.id,
                categoryId,
                city,
                country,
            },
            include: {
                category: true,
            },
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
            city,
            country,
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
                city,
                country,
            }, 
            include: {
                category: true,
            },
        });
        res.json(post);
    } catch (error) {
        next(error);        
    }
});

// DELETE
app.delete("/api/posts/:id", authenticate, async (req, res, next) => {
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
        if (!req.user?.isAdmin) {
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
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: "Forbidden: Only admins can perform this action" });
        }

        await prisma.category.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.status(204).send(); 
    } catch (error) {
        next(error);
    }
});


// ----- Messages ROUTES -------
app.get("/api/messages", authenticate, async (req, res, next) => {
    try {
        const userId = req.user?.id;
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

        const userId = req.user?.id;
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
        const senderId = req.user?.id;
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
        const userId = req.user?.id;
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
        const userId = req.user.id;

        const followingList = await prisma.follow.findMany({
            where: { followerId: userId},
            include: {
                following: true,
            },
        });

        res.json(followingList.map(f => f.following));
    } catch (error) {
        next(error);
    }
});

app.get("/api/followers", authenticate, async (req, res, next) => {
    try {
        const userId = req.user?.id;
        
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
        const followerId = req.user?.id;
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
        const followerId = req.user?.id;
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
        const id = req.user?.id;

        const collections = await prisma.collection.findMany({
            where: { userId: parseInt(id)},
            include: {
                posts: true,
            },
        });

        res.json(collections);
    } catch (error) {
        next(error);
    }
});

// Get collections by a specific user
app.get("/api/collections/users/:id", async (req, res, next) => {
    const { id } = req.params; // Get user ID from the URL

    try {
        const collections = await prisma.collection.findMany({
            where: { userId: parseInt(id) },  // Ensure the user ID is passed correctly
        });
        if (collections.length === 0) {
            return res.status(200).json([]);  // Ensure an empty array is returned
        }

        res.json(collections);
    } catch (error) {
        res.status(500).json({ error: "Error fetching collections" });
        next();
    }
});

app.post("/api/collections", authenticate, async (req, res, next) => {
    try {
        const userId = req.user?.id;
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