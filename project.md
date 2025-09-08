I would like us to build a web app to store my personal library of books. This web app will consist of a database layer and a front-end. I want to keep the code/deployment surface as simple as possible as this is just a project for my family to use. 

Some requests
- I want to take advantage of Vercel's free tier. So I want the app to deploy there via github. I can manage the connection between github and vercel so don't worry about that. I would like to use react for the front end but I could be convinced to use Next if you think better. However, in either case lets use typescript. 
- I will need a DB to store this info. Vercel has from free offerings - Lets consider those. Even a SQLite approach at first would be OK but I want to avoid that.

Features
I need to be able to add/remove/edit entries(books) on a web page. 
The attributes each book will need are: (* are required fields) 
Title*, 
Author, 
Publish Date, 
Summary, 
State* (In library, checked out, lost), 
Current possessor* (Tony, friend, etc.), 
times read (0,1,2,3), 
last read (date), 
date added to library* (scan date)

Note: when I say "scan date" this is for a future feature where I will use the camera to scan the ISBN. For the initial approach lets just have the user input the ISBN and look up the information about the book via a free API - Can you also help me find a free REST api to use?

Features for now:
- Input books via ISBN
- Store information in DB
- Show books on front end 

Features for later (just to consider on design):
- Scan ISBN on book
- Check out/in 