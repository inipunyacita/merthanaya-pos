# Merthanaya POS - Backend

A FastAPI backend for the Traditional Market Hybrid POS System.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

4. Run the development server:
```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### Products
- `GET /products/` - List all products
- `GET /products/{id}` - Get product by ID
- `GET /products/barcode/{barcode}` - Get product by barcode
- `POST /products/` - Create product
- `PUT /products/{id}` - Update product
- `DELETE /products/{id}` - Soft delete product

### Orders
- `POST /orders/` - Create new order (generates daily ID)
- `GET /orders/pending` - Get pending orders for cashier
- `GET /orders/{id}` - Get order details
- `PATCH /orders/{id}/pay` - Mark order as paid
- `PATCH /orders/{id}/cancel` - Cancel order

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
