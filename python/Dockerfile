FROM python:3.9.2

WORKDIR /packages
COPY pango_helpers /packages/helpers
ENV PYTHONPATH "${PYTHONPATH}:/packages"
WORKDIR /workspace

RUN useradd apps
RUN mkdir -p /home/apps && chown apps:apps /home/apps

ENV APKGS fonts-liberation

# By copying over requirements first, we make sure that Docker will cache
# our installed requirements rather than reinstall them on every build
COPY requirements.txt /workspace/requirements.txt
RUN pip install --upgrade pip

RUN pip install -r requirements.txt


