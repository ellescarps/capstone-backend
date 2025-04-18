const bcrypt = require("bcrypt");
const saltRounds = 10;
const prisma = require("../prisma");


const seed = async () => {

const createUserWithHashedPassword = async (name, email, password, isAdmin, locationId, shippingResponsibility, shippingOption, profilePicUrl) => {
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
        await prisma.country.createMany( { data: countries });
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
     await prisma.location.createMany({ data: locations });
  };

  const createCategory = async () => {
    const category = [
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
     await prisma.category.createMany({ data: category });
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
       },
    ];
   // Use the helper function for creating users with hashed passwords
   for (const user of users) {
    await createUserWithHashedPassword(user.name, user.email, user.password, user.isAdmin, user.locationId, user.shippingResponsibility, user.shippingOption, user.profilePicUrl);
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
        },
    ];
    await prisma.post.createMany( { data: posts });
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
    await prisma.like.createMany({ data:likes })
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
    await prisma.comment.createMany( { data: comments })
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
    await prisma.favorite.createMany( { data: favorites });
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
    await prisma.message.createMany( { data: messages} );
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
    await prisma.follow.createMany( {data: follows});
 };

 const createCollections = async () => {
    const users = await prisma.user.findMany();

    const collection = [
       {
        name: "Books To Read",
        userId: users[0].id
       },
       {
        name: "Outfits",
        userId: users[1].id
       },
    ];
   await prisma.collection.createMany( { data: collection });
 };


 const createImages = async () => {
    const posts = await prisma.post.findMany();

    const images = [
       {
        url: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1479692098i/5664985.jpg",
        postId: posts[0].id,
       },
    ];
    await prisma.image.createMany( {data: images});
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
    await prisma.media.createMany({ data: media});
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