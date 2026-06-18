from django.shortcuts import render
from django.contrib.auth.models import User
from django.db.models import Sum, Avg
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Transaction
from .serializers import UserRegisterSerializer, TransactionSerializer, MyTokenObtainPairSerializer

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


# Create your views here.
def all_app(request):
    return render(request, 'apptry/app.html')

class UserRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "User registered successfully",
                "username": user.username
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        category = self.request.query_params.get('category')
        month = self.request.query_params.get('month')        # format: YYYY-MM
        tx_type = self.request.query_params.get('type')
        
        queryset = self.request.user.transactions.all()
        
        if category and category != 'ALL':
            queryset = queryset.filter(category=category)
            
        if month:
            try:
                parts = month.split('-')
                if len(parts) == 2:
                    queryset = queryset.filter(date__year=int(parts[0]), date__month=int(parts[1]))
            except ValueError:
                pass
                
        if tx_type and tx_type != 'ALL':
            queryset = queryset.filter(type=tx_type)
            
        return queryset.order_by('-date', '-id')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class AnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # 1. Total Income
        total_income_agg = Transaction.objects.filter(user=user, type='income').aggregate(Sum('amount'))['amount__sum']
        total_income = float(total_income_agg) if total_income_agg else 0.0

        # 2. Total Expense
        total_expense_agg = Transaction.objects.filter(user=user, type='expense').aggregate(Sum('amount'))['amount__sum']
        total_expense = float(total_expense_agg) if total_expense_agg else 0.0

        # 3. Net Savings
        net_savings = round(total_income - total_expense, 2)

        # 4. Average Expense (for expense type only)
        avg_expense_agg = Transaction.objects.filter(user=user, type='expense').aggregate(Avg('amount'))['amount__avg']
        average_expense = round(float(avg_expense_agg), 2) if avg_expense_agg else 0.0

        # 5. Expense Breakdown
        exp_rows = Transaction.objects.filter(user=user, type='expense').values('category').annotate(total=Sum('amount')).order_by('-total')
        expense_breakdown = []
        for r in exp_rows:
            cat_total = float(r['total'])
            percentage = (cat_total / total_expense * 100) if total_expense > 0 else 0.0
            expense_breakdown.append({
                "category": r['category'],
                "total": cat_total,
                "percentage": round(percentage, 2)
            })

        top_expense_category = expense_breakdown[0]['category'] if expense_breakdown else "None"

        # 6. Income Breakdown
        inc_rows = Transaction.objects.filter(user=user, type='income').values('category').annotate(total=Sum('amount')).order_by('-total')
        income_breakdown = []
        for r in inc_rows:
            cat_total = float(r['total'])
            percentage = (cat_total / total_income * 100) if total_income > 0 else 0.0
            income_breakdown.append({
                "category": r['category'],
                "total": cat_total,
                "percentage": round(percentage, 2)
            })

        # 7. Monthly Comparative Trend (group by month in Python to be database-agnostic)
        txs = Transaction.objects.filter(user=user).order_by('date')
        monthly_data = {}
        for t in txs:
            m_str = t.date.strftime('%Y-%m')
            if m_str not in monthly_data:
                monthly_data[m_str] = {
                    "month": m_str,
                    "income": 0.0,
                    "expense": 0.0
                }
            if t.type == 'income':
                monthly_data[m_str]['income'] += float(t.amount)
            else:
                monthly_data[m_str]['expense'] += float(t.amount)

        monthly_trend = sorted(monthly_data.values(), key=lambda x: x['month'])

        analytics = {
            "total_income": total_income,
            "total_expense": total_expense,
            "net_savings": net_savings,
            "expense_breakdown": expense_breakdown,
            "income_breakdown": income_breakdown,
            "top_expense_category": top_expense_category,
            "average_expense": average_expense,
            "monthly_trend": monthly_trend
        }

        return Response(analytics)