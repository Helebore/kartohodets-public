from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="my-backend",
    version="0.1.0",
    author="Your Name",
    description="Backend API with FastAPI and PostgreSQL",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=open("backend/requirements.txt", "r", encoding="utf-8").readlines(),
    extras_require={
        "dev": [
            "pytest==7.4.3",
            "black==23.11.0",
            "flake8==6.1.0",
        ]
    },
)