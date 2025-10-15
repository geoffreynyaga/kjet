from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User

def signup_view(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        print(f"Form data: {request.POST}")
        print(f"Form is valid: {form.is_valid()}")
        if not form.is_valid():
            print(f"Form errors: {form.errors}")
            print(f"Non-field errors: {form.non_field_errors()}")

        if form.is_valid():
            try:
                user = form.save(commit=False)
                user.email = request.POST.get('email', '')
                user.first_name = request.POST.get('first_name', '')
                user.last_name = request.POST.get('last_name', '')
                user.save()
                login(request, user)
                return redirect('/')
            except Exception as e:
                print(f"Exception during user creation: {str(e)}")
                form.add_error(None, f'Error creating user: {str(e)}')
        # If form is not valid, errors will be automatically included in the form object
    else:
        form = UserCreationForm()

    print(f"Rendering template with form errors: {form.errors}")
    return render(request, 'accounts/signup.html', {'form': form})

def login_view(request):
    print("Rendering login template")
    if request.method == 'POST':
        form = AuthenticationForm(data=request.POST)
        print(f"Login form data: {request.POST}")
        print(f"Login form is valid: {form.is_valid()}")
        if not form.is_valid():
            print(f"Login form errors: {form.errors}")
            print(f"Login non-field errors: {form.non_field_errors()}")

        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('/')  # Redirect to a home page or dashboard
            else:
                print("Authentication failed - adding error")
                form.add_error(None, 'Invalid username or password.')
        # If form is not valid, errors will be automatically included in the form object
    else:
        form = AuthenticationForm()

    print(f"Rendering login template with form errors: {form.errors}")
    return render(request, 'accounts/login.html', {'form': form})

def logout_view(request):
    logout(request)
    return redirect('/')