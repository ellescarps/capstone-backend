const bcrypt = require("bcrypt");
const saltRounds = 10;
const prisma = require("../prisma");


const seed = async () => {

const createUserWithHashedPassword = async (name, email, password, isAdmin, locationId, shippingResponsibility, shippingOption, profilePicUrl) => {
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });
    
    if (!existingUser) {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

    await prisma.user.create({
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
} else {
    console.log(`User with email ${email} already exists.`);
}
};



  // TODO: Create Locations, Country, Categories, Users, Posts, Likes, Comments, Favorites, Messages, Follows, Collections, Images, Media,

  const createCountries = async () => {
    const countries = [
        {
            name: "Turtle Island",
            code: "TI",
        },
        {
            name: "Palestine",
            code: "PS",
        },
        {
            name: "Kanata",
            code: "KA",
        }, 
    ];
        await prisma.country.createMany( { 
            data: countries,
            skipDuplicates: true, 
         });
  };


  const createLocations = async () => {
    const countries = await prisma.country.findMany();

     const locations = [
        {
            city: "New York City",
            latitude: 40.713051,
            longitude: -74.007233,
            countryId: countries.find(c => c.code === "TI").id,
        },
        {
            city: "Ramallah",
            latitude: 31.9038,
            longitude: 35.2034,
            countryId: countries.find(c => c.code === "PS").id,
        },
        {
            city: "Prince Edward Island",
            latitude: 46.31379699707031,
            longitude: -63.25200653076172,
            countryId: countries.find(c => c.code === "KA").id,
        },
        {
            city: "Chicago",
            latitude: 41.8755616,
            longitude: -87.6244212,
            countryId: countries.find(c => c.code === "TI").id,
        },
     ];
     for (const location of locations) {
        const existingLocation = await prisma.location.findFirst({
            where: {
              city: location.city,
              countryId: location.countryId, // optional but helpful if cities repeat
            },
          });
    
        if (!existingLocation) {
          await prisma.location.create({
            data: location,
          });
        }
      }
};

  const createCategory = async () => {
    const categories = [
        { name: "Clothing"},
        { name: "Home Goods" },
        { name: "Furniture"},
        { name: "Kitchen & Appliances"},
        { name: "Books"},
        { name: "Electronics"},
        { name: "Bathroom Needs"},
        { name: "Mobility Aids & Assistive Devices" },
        { name: "Food"},
        { name: "Pet Supplies"},
        { name: "Sporting Goods"},
        { name: "Toys & Games"},
        { name: "Musical Instruments"},
        { name: "Health & Beauty"},
    ];
    for (let category of categories) {
        await prisma.category.upsert({
          where: { name: category.name }, // Use a unique identifier like name
          update: {}, // No need to update anything if the category already exists
          create: {
            name: category.name,
          },
        });
      }
};

  const createUsers = async () => {
    const locations = await prisma.location.findMany();  

    const users = [
       {
        name: "Michelle Rose",
        email: "elle.scarps@gmail.com",
        password: "lincoln123",
        profilePicUrl: "https://static.wikia.nocookie.net/courage/images/4/46/New_Courage.png/revision/latest?cb=20200912151506",
        isAdmin: true,
        locationId: locations.find(l => l.city === "New York City").id,
        shippingResponsibility: "SHARED",
        shippingOption: "BOTH",
        bio: "Mutual Aid and Community Activist",
        websiteUrl: "https://michelle-rose.dev",
        socialLinks: {
         instagram: "https://instagram.com/michelle.rose",
         twitter: "https://twitter.com/michellecodes",
         linkedin: "https://linkedin.com/in/michellerose",
         },
       },
       {
        name: "Luna B",
        email: "tweetsmiles@gmail.com",
        password: "lincoln123",
        profilePicUrl: "https://static.vecteezy.com/system/resources/thumbnails/008/006/949/small_2x/the-moon-and-deep-space-photo.jpg",
        isAdmin: false,
        locationId: locations.find(l => l.city === "New York City").id,
        shippingResponsibility: "GIVER",
        shippingOption: "SHIPPING",
        bio: "Moonchild sharing love & light",
        website: "https://lunab.dev",
        socialLinks: {
         instagram: "https://instagram.com/lunab",
         tiktok: "https://tiktok.com/@lunab",
            },
        },
    ];
   // Use the helper function for creating users with hashed passwords
   for (const user of users) {
    await createUserWithHashedPassword(user.name, user.email, user.password, user.isAdmin, user.locationId, user.shippingResponsibility, user.shippingOption, user.profilePicUrl);
}
 };

 const updateUser = async (userId, updatedData) => {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (user) {
        await prisma.user.update({
            where: { id: userId },
            data: updatedData
        });
    } else {
        console.log(`User with ID ${userId} not found`);
    }
};



 const createPosts = async () => {
    const users = await prisma.user.findMany();
    const categories = await prisma.category.findMany();
    const locations = await prisma.location.findMany();

    const posts = [
       {
        title: "Along for the Ride",
        description: "YA Romance Novel by Sarah Dessen",
        shippingCost: 5.00,
        shippingResponsibility: "RECEIVER",
        shippingOption: "SHIPPING",
        isAvailable: true,
        isFeatured: true,
        trendingScore: 25,
        userId: users[0].id,
        categoryId: categories.find( c => c.name === "Books").id,
        locationId: locations.find(l => l.city === "New York City").id,
        type: "post",
        },
        {
            title: "the Green Witch Tarot Companion",
            description: "Tarot Cards Book",
            shippingCost: 5.00,
            shippingResponsibility: "GIVER",
            shippingOption: "PICKUP",
            isAvailable: true,
            isFeatured: true,
            trendingScore: 2,
            userId: users[0].id,
            categoryId: categories.find( c => c.name === "Books").id,
            locationId: locations.find(l => l.city === "New York City").id,
            type: "callout",
        },
        {
            title: "One Day, Everyone Will Have Always Been Against This",
            description: "Book by Omar El Akkad",
            shippingCost: 5.00,
            shippingResponsibility: "SHARED",
            shippingOption: "BOTH",
            isAvailable: true,
            isFeatured: true,
            trendingScore: 25,
            userId: users[0].id,
            categoryId: categories.find( c => c.name === "Books").id,
            locationId: locations.find(l => l.city === "New York City").id,
            type: "post",
        },
    ];
    for (const post of posts) {
        const existingPost = await prisma.post.findFirst({
            where: { title: post.title }
          });

        if (!existingPost) {
          await prisma.post.create({
            data: post,
          });
        }
      }
};

 const createLikes= async () => {
    const posts = await prisma.post.findMany();
    const users = await prisma.user.findMany();

    const likes = [
       {
        userId: users[0].id,
        postId: posts[1].id,
       },
       {
        userId: users[1].id,
        postId: posts[0].id,
       },
    ];
    // Loop through the likes array and check if the like already exists
    for (const like of likes) {
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId: like.userId,
                    postId: like.postId,
                },
            },
        });

        if (!existingLike) {
            // If the like doesn't exist, create it
            await prisma.like.create({
                data: like,
            });
        } else {
            console.log(`Like already exists for user ${like.userId} on post ${like.postId}`);
        }
    }
};

 const createComments = async () => {
    const posts = await prisma.post.findMany();
    const users = await prisma.user.findMany();

    const comments = [
       {
        content: "Love this book!",
        userId: users[0].id,
        postId: posts[0].id,
       },
    ];
    for (const comment of comments) {
        const existingComment = await prisma.comment.findFirst({
            where: {
                userId: comment.userId,
                postId: comment.postId,
            }
        });

    
        if (!existingComment) {
          await prisma.comment.create({
            data: comment,
          });
        }
      }
};

 const createFavorites= async () => {
    const posts = await prisma.post.findMany();
    const users = await prisma.user.findMany();

    const favorites = [
       {
        
            userId: users[0].id,
            postId: posts[0].id,
        },
        {
            userId: users[0].id,
            postId: posts[2].id,
        },
    ];
    for (const favorite of favorites) {
        const existingFavorite = await prisma.favorite.findUnique({
            where: {
                userId_postId: {
                    userId: favorite.userId,
                    postId: favorite.postId,
                },
            },
        });

        if (!existingFavorite) {
            await prisma.favorite.create({
                data: favorite,
            });
            console.log(`Favorite added for user ${favorite.userId} on post ${favorite.postId}`);
        } else {
            console.log(`Favorite already exists for user ${favorite.userId} on post ${favorite.postId}`);
        }
    }
};


 const createMessages = async () => {
    const users = await prisma.user.findMany();

    const messages = [
        {
            content: "Hey could we do a local pickup?",
            senderId: users[0].id,
            receiverId: users[1].id,
          },
          {
            content: "Yes! Let's meet at a coffee shop near us or halfway!",
            senderId: users[1].id,
            receiverId: users[0].id,
          },
    ];
    for (const message of messages) {
        const existingMessage = await prisma.message.findFirst({
            where: {
              senderId: message.senderId,
              receiverId: message.receiverId,
              content: message.content,
            },
          });
    
        if (!existingMessage) {
          await prisma.message.create({
            data: message,
          });
        }
      }
};

 const createFollows = async () => {
    const users = await prisma.user.findMany();

    const follows = [
        {
            followerId: users[0].id,
            followingId: users[1].id,
          },
          {
            followerId: users[1].id,
            followingId: users[0].id,
          },
    ];
    for (const follow of follows) {
        const existingFollow = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: follow.followerId,
                    followingId: follow.followingId,
                },
            },
        });

        if (!existingFollow) {
            await prisma.follow.create({
                data: follow,
            });
            console.log(`Follow relationship created for ${follow.followerId} following ${follow.followingId}`);
        } else {
            console.log(`Follow relationship already exists for ${follow.followerId} following ${follow.followingId}`);
        }
    }
};

 const createCollections = async () => {
    const users = await prisma.user.findMany();

    const collections = [
       {
        name: "Books To Read",
        userId: users[0].id
       },
       {
        name: "Outfits",
        userId: users[1].id
       },
    ];
    for (const collection of collections) {
        const existingCollection = await prisma.collection.findFirst({  // Changed findUnique to findFirst
            where: {
                AND: [
                    { name: collection.name }, 
                    { userId: collection.userId }
                ],
            },
        });
    
        if (!existingCollection) {
            await prisma.collection.create({
                data: collection,
            });
            console.log(`Collection created for ${collection.name} by user ${collection.userId}`);
        } else {
            console.log(`Collection already exists for ${collection.name} by user ${collection.userId}`);
        }
    }
};


 const createImages = async () => {
    const posts = await prisma.post.findMany();

    const images = [
       {
        url: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1479692098i/5664985.jpg",
        postId: posts[0].id,
       },
    ];
    for (const image of images) {
        const existingImage = await prisma.image.findFirst({
            where: {
                AND: [
                    { url: image.url },
                    { postId: image.postId }
                ]
            },
        });

        if (!existingImage) {
            await prisma.image.create({
                data: image,
            });
            console.log(`Image created for post ${image.postId}`);
        } else {
            console.log(`Image already exists for post ${image.postId}`);
        }
    }
};

 const createMedia = async () => {
    const posts = await prisma.post.findMany();

    const media = [
       {
        type: "video",
        url: "https://www.youtube.com/watch?v=wgm2GbbE_78&ab_channel=ONEMediaCoverage",
        postId: posts[0].id,
    },
    ];
    
    for (const item of media) {
        const existingMedia = await prisma.media.findFirst({
            where: {
                AND: [
                    { url: item.url },
                    { postId: item.postId }
                ]
            },
        });

        if (!existingMedia) {
            await prisma.media.create({
                data: item,
            });
            console.log(`Media created for post ${item.postId}`);
        } else {
            console.log(`Media already exists for post ${item.postId}`);
        }
    }
};


 await createCountries();
 await createLocations();
 await createCategory();
 await createUsers();
 await createPosts();
 await createLikes();
 await createComments();
 await createFavorites();
 await createMessages();
 await createFollows();
 await createCollections();
 await createImages();
 await createMedia();

};

seed()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });