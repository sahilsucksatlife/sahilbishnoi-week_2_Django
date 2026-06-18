import os
import django
import random
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Django.settings')
django.setup()

from django.contrib.auth.models import User
from apptry.models import Transaction

def populate():
    # 1. Create or get user
    username = 'sahil'
    email = 'sahil@example.com'
    password = 'password123'
    
    user, created = User.objects.get_or_create(username=username, defaults={'email': email})
    if created:
        user.set_password(password)
        user.save()
        print(f"Created user: {username} with password: {password}")
    else:
        print(f"User {username} already exists.")

    # Clean old transactions to prevent duplicates
    Transaction.objects.filter(user=user).delete()

    # 2. Mock Data definitions
    expense_cats = [
        ("Food & Dining", ["Burger King", "Sushi dinner", "Groceries", "Coffee shop", "Lunch combo"]),
        ("Transport & Fuel", ["Uber ride", "Gas station", "Subway pass", "Car wash"]),
        ("Rent & Utilities", ["Monthly Rent", "Electricity bill", "Water bill", "Internet"]),
        ("Entertainment & Leisure", ["Netflix subscription", "Cinema ticket", "Concert ticket", "Bowling with friends"]),
        ("Shopping & Apparel", ["Winter Jacket", "New Sneakers", "T-shirt", "Backpack"]),
        ("Health & Medical", ["Pharmacy", "Dental checkup", "Gym membership"]),
        ("Education", ["Textbook", "Online Course fee"]),
        ("Investments & Business", ["Software subscription", "Domain registration"]),
        ("Others", ["Gift wrap", "Mailing fee"])
    ]

    income_cats = [
        ("Salary & Wages", ["Monthly Salary Paycheck", "Bi-weekly Wages"]),
        ("Investments & Yield", ["Stock Dividend", "Crypto interest"]),
        ("Gifts & Bonuses", ["Birthday Gift", "Performance Bonus"]),
        ("Side Hustles", ["Freelance Web Dev", "Sold old furniture"]),
        ("Others", ["Cashback reward"])
    ]

    # Generate dates over the last 3 months
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=90)
    
    current_date = start_date
    tx_count = 0
    
    while current_date <= end_date:
        if random.random() < 0.75: # 75% chance of transaction on any given day
            num_txs = random.randint(1, 2)
            for _ in range(num_txs):
                is_income = random.random() < 0.12 # 12% chance of income, 88% chance of expense
                if is_income:
                    cat, notes_list = random.choice(income_cats)
                    amount = round(random.uniform(200, 2000), 2)
                    tx_type = 'income'
                else:
                    cat, notes_list = random.choice(expense_cats)
                    amount = round(random.uniform(8, 120), 2)
                    # Monthly rent exception
                    if cat == "Rent & Utilities" and random.random() < 0.15:
                        amount = round(random.uniform(600, 900), 2)
                    tx_type = 'expense'
                
                notes = random.choice(notes_list)
                
                Transaction.objects.create(
                    user=user,
                    amount=amount,
                    category=cat,
                    date=current_date,
                    notes=notes,
                    type=tx_type
                )
                tx_count += 1
                
        current_date += timedelta(days=1)
        
    print(f"Successfully generated {tx_count} transactions for user '{username}'!")

if __name__ == '__main__':
    populate()
