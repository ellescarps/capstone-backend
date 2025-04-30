require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require('path');
const shippo = require("shippo");
const fileUpload = require('express-fileupload');
const fs = require('fs');
const app = express();

const PORT = 3000;

const prisma = require("./prisma");
const { category } = require("./prisma");

app.use(cors({ origin: /localhost/ }));
app.use(express.json());
app.use(require("morgan")("dev"));
// Add this with your other middleware
app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    abortOnLimit: true
  }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

const JWT_SECRET = process.env.JWT_SECRET || "secretcoven";


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
  
  // Add the validate-token endpoint
  app.get('/api/validate-token', authenticate, (req, res) => {
      // If middleware passes, token is valid
      res.status(200).json({ 
          valid: true,
          user: req.user 
      });
  });

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

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

        res.json({ message: "Registration complete.", token, user });

    } catch (error) {
        next(error);
    }
});

// Login a user
app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ 
        where: { email },
        select: {
          id: true,
          password: true,
          username: true,
          email: true,
          name: true,
          profilePicUrl: true,
          bio: true,
          city: true,
          country: true,
          shippingOption: true,
          shippingResponsibility: true
        }
      });
      
      if (!user) return res.status(400).json({ error: "Invalid credentials" });
      
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ error: "Invalid credentials" });
  
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
      
      // Remove password before sending response
      const { password: _, ...userData } = user;
      
      res.json({ 
        token,
        user: userData
      });
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

// GET user profile, direct lookup
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

app.get('/api/users/me', authenticate, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          profilePicUrl: true,
          bio: true,
          websiteUrl: true,
          socialLinks: true,
          isAdmin: true,
          city: true,
          country: true,
          shippingOption: true,
          shippingResponsibility: true,
          // Include counts for relationships if needed
          _count: {
            select: {
              posts: true,
              collections: true,
              followers: true,
              follows: true
            }
          }
        }
      });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

//   for public profile viewing
  app.get('/api/users/:username', async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { username: req.params.username },
        select: {
          // Public fields only
          username: true,
          name: true,
          profilePicUrl: true,
          bio: true,
          websiteUrl: true,
          city: true,
          country: true,
          _count: {
            select: {
              posts: true,
              followers: true,
              follows: true
            }
          }
        }
      });
      
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
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
            data: req.body, 
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
            where: {
                ...(category ? {
                    category: {
                        name: {
                            equals: category,
                            mode: "insensitive",
                        },
                    },
                } : {}),
            },
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
app.get('/api/posts/users/:id', authenticate, async (req, res, next) => {
    const { id } = req.params; 
    const { type } = req.query;  

    const userId = parseInt(id);
    if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
    }

    try {
        const posts = await prisma.post.findMany({
            where: {
                userId: userId,
                type: type,  
            },
        });

        if (posts.length === 0) {
            console.log("No posts found for this user with type:", type);
            return res.status(404).json({ message: `No ${type} found for this user` });
        }

        res.json({
            status: 'success',
            data: posts,
        });
    } catch (error) {
        console.error("Error fetching posts:", error); 
        res.status(500).json({ error: "Error fetching posts" });
        next(error);
    }
});



// Updated POST route with float conversion for shippingCost
app.post("/api/posts", authenticate, async (req, res) => {
    try {
      console.log('Request body:', req.body);
      console.log('Files:', req.files);
  
      const {
        title,
        description,
        category,
        shippingCost,
        shippingOption = 'PICKUP',
        shippingResponsibility = 'SHARED',
        city = '',
        country = '',
        type
      } = req.body;
  
      if (!title || !description || !category) {
        return res.status(400).json({
          error: "Missing required fields",
          details: {
            title: !title && "Required",
            description: !description && "Required",
            category: !category && "Required"
          }
        });
      }
  
      const shippingCostFloat = parseFloat(shippingCost);
      if (isNaN(shippingCostFloat)) {
        return res.status(400).json({ error: "Invalid shipping cost format" });
      }
  
      // Normalize and validate enums
      const validShippingOptions = ["PICKUP", "SHIPPING", "DROPOFF"];
      const validShippingResponsibilities = ["GIVER", "RECEIVER", "SHARED"];
  
      const normalizedOption = shippingOption.toUpperCase();
      const normalizedResponsibility = shippingResponsibility.toUpperCase();
  
      if (!validShippingOptions.includes(normalizedOption)) {
        return res.status(400).json({ error: "Invalid shipping option" });
      }
      if (!validShippingResponsibilities.includes(normalizedResponsibility)) {
        return res.status(400).json({ error: "Invalid shipping responsibility" });
      }
  
      const categoryRecord = await prisma.category.upsert({
        where: { name: category },
        create: { name: category },
        update: {}
      });
  
      let imageUrl = null;
      if (req.files?.image) {
        const imageFile = req.files.image;
        const uniqueName = `${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`;
        const uploadPath = path.join(__dirname, 'public/uploads', uniqueName);
  
        if (!fs.existsSync(path.join(__dirname, 'public/uploads'))) {
          fs.mkdirSync(path.join(__dirname, 'public/uploads'), { recursive: true });
        }
  
        await imageFile.mv(uploadPath);
        imageUrl = `/uploads/${uniqueName}`;
      }
  
      const newPost = await prisma.post.create({
        data: {
          title,
          description,
          isAvailable: true,
          shippingCost: shippingCostFloat,
          shippingOption: normalizedOption,
          shippingResponsibility: normalizedResponsibility,
          type,
          city,
          country,
          userId: req.user.id,
          categoryId: categoryRecord.id,
          ...(imageUrl && {
            images: {
              create: { url: imageUrl }
            }
          })
        },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              username: true,
              profilePicUrl: true
            }
          },
          ...(imageUrl && { images: true })
        }
      });
  
      res.status(201).json(newPost);
    } catch (error) {
      console.error("Post creation error:", error);
      res.status(500).json({
        error: "Failed to create post",
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  });
  



// EDIT
app.put("/api/posts/:id", authenticate, async (req, res, next) => {
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
                createdAt: new Date(),
            },
        });
        await newMessage.save();
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
app.get("/api/collections", authenticate, async (req, res, next) => {
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
app.get("/api/collections/users/:id", authenticate, async (req, res, next) => {
    const { id } = req.params; 

    try {
        const collections = await prisma.collection.findMany({
            where: { userId: parseInt(id) },  
        });
        if (collections.length === 0) {
            return res.status(200).json([]);  
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

app.put('/api/collections/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
        const updatedCollection = await prisma.collection.update({
            where: { id: Number(id) },
            data: { name },
        });
        res.json(updatedCollection);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update collection' });
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


// Initialize Shippo client properly
const shippoClient = new shippo.Shippo(process.env.SHIPPO_API_KEY);  // Use 'new' keyword

// Function to get shipping rates from Shippo
const getShippingCost = async (fromZip, toZip, weight) => {
  try {
    const shipment = await shippoClient.shipment.create({
      address_from: { zip: fromZip },
      address_to: { zip: toZip },
      parcels: [{ weight: weight }],
    });

    if (shipment && shipment.rates) {
      return shipment.rates;  // Return rates if available
    } else {
      return null;  // No rates found
    }
  } catch (error) {
    console.error("Error fetching shipping rates:", error);
    throw new Error("Failed to fetch shipping rates");
  }
};

// Example Express.js route
app.get('/api/shipping-rates', (req, res) => {
    const { fromZip, toZip, weight } = req.query;

    // Here, you would calculate the shipping cost based on the parameters
    // For now, returning a mock value
    if (!fromZip || !toZip || !weight) {
        return res.status(400).json({ error: 'Missing required query parameters.' });
    }

    const shippingCost = 10; // Example fixed cost, replace with your calculation logic
    res.json([{ amount: shippingCost }]);  // Returning mock data
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