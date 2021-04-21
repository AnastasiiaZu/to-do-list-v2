const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//requiering and connecting to Mongoose + creating todolistDB - need to fix deprecation warnings until the new version comes out
mongoose.connect("mongodb+srv://admin_anastasiia:<PASSWORD_AND_TABLE>.mongodb.net/todolistDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//***** V1 used arrays to store data
// const items = ["Buy food", "Cook the food", "Eat the food"];
// const workItems = ["Do the work"]

//V2 uses MongoDB &  Mongoose:

//first create a Schema
const itemsSchema = {
  name: String
};
//then create a new model (collection) after this schema
const Item = mongoose.model("Item", itemsSchema);

//add documents to the collection
const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

//putting documents into an array
const defaultItems = [item1, item2, item3];

//will add new pages when user created them
const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

// The GET HOME route //
app.get("/", function(req, res) {
//finding the data that was inserted
  Item.find({}, function(err, foundItems){
//inserting all documents into the Mongo // DB but only once (the if statement)
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err){
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully savevd default items to DB.");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", {listTitle: "Today", newListItems: foundItems});
    }
  });
});

//DYNAMIC GET routes -
//depend on the input parameters. customListName = what user enters after a https:localhost:3000/...
app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName);

//creating new routes, saving them to the List collecion and giving them content from defaultItems
  List.findOne({name: customListName}, function(err, foundList){
    if (!err){
      if (!foundList){
        //Create a new list
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        //Show an existing list

        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });
});

//POST route to grab data from HTTP body into Mongo DB
app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  // creating a new MongoDB document
  const item = new Item({
    name: itemName
  });

//checking which list to add the item to
  if (listName === "Today"){
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

// DELETE route - getting the id of a checked item and deleting it
app.post("/delete", function(req, res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function(err){
      if (!err) {
        console.log("Successfully deleted checked item.");
        res.redirect("/");
      }
    });
  } else {
    // $pull operator deleted the found item
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      if (!err){
        res.redirect("/" + listName);
      }
    });
  }
});

app.get("/about", function(req, res){
  res.render("about");
});

//LISTENING on port 3000 and Heroku
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);
